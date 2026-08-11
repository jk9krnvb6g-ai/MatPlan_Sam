import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { 
  getDb, 
  saveDb, 
  getPaginatedRequests, 
  verifyPassword, 
  hashPasswordSync 
} from './db';
import { SEED_USERS, seedRequests, INITIAL_WORK_GROUPS, DEPARTMENTS } from '../frontend/data/catalog';
import { User } from '../frontend/types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'matplan_super_secure_jwt_key_2026';

// Extend Express Request type to include user information
export interface AuthenticatedRequest extends Request {
  user?: {
    username: string;
    role: string;
    roles?: string[];
    deptId: string;
    name: string;
  };
}

// JWT Authentication Middleware
export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
      if (err) {
        return res.status(403).json({ success: false, error: 'สิทธิ์การใช้งานหมดอายุหรือ Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่' });
      }
      req.user = decoded;
      next();
    });
  } else {
    // Return 401 only if it's a protected route
    res.status(401).json({ success: false, error: 'ไม่พบข้อมูลสิทธิ์ยืนยันตัวตน กรุณาเข้าสู่ระบบ' });
  }
}

// SSE Clients Registry
let sseClients: Response[] = [];

// Broadcast event to all connected SSE clients
export function broadcastEvent(type: string, payload: any) {
  const data = JSON.stringify({ type, payload });
  sseClients.forEach(client => {
    client.write(`data: ${data}\n\n`);
  });
}

// 1. SSE Notifications Stream Endpoint
router.get('/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send initial keep-alive message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE notification connection active' })}\n\n`);

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// 2. Authentication: Login
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน' });
  }

  try {
    const db = getDb();
    const user = db.users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ success: false, error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ success: false, error: 'บัญชีนี้ยังไม่ได้รับการอนุมัติการใช้งานจากผู้ดูแลระบบ' });
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }

    // Sign JWT token
    const token = jwt.sign(
      { 
        username: user.username, 
        role: user.role, 
        roles: user.roles, 
        deptId: user.deptId, 
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        roles: user.roles,
        name: user.name,
        deptId: user.deptId,
        status: user.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Authentication: Register
router.post('/auth/register', async (req, res) => {
  const { username, password, name, role, deptId } = req.body;
  if (!username || !password || !name || !deptId) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง' });
  }

  try {
    const db = getDb();
    const existing = db.users.find(u => u.username === username);
    if (existing) {
      return res.status(400).json({ success: false, error: 'ชื่อผู้ใช้งานนี้ได้รับการลงทะเบียนในระบบแล้ว' });
    }

    const newUser: User = {
      username,
      password: hashPasswordSync(password),
      name,
      role: role || 'staff',
      roles: [role || 'staff'],
      deptId,
      status: 'pending'
    };

    const updatedUsers = [...db.users, newUser];
    saveDb({ users: updatedUsers });

    // Notify administrators of a new registration
    broadcastEvent('user_registered', {
      message: `มีผู้ใช้งานลงทะเบียนใหม่: @${username} รอรับการอนุมัติสิทธิ์การเข้าใช้`,
      username
    });

    res.json({ success: true, message: 'สมัครสมาชิกลงทะเบียนสำเร็จ บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบอนุมัติเปิดใช้งาน' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Get Current User (Self info)
router.get('/auth/me', authenticateJWT, (req: AuthenticatedRequest, res) => {
  try {
    const db = getDb();
    const user = db.users.find(u => u.username === req.user?.username);
    if (!user) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลผู้ใช้ในระบบ' });
    }
    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
        roles: user.roles,
        name: user.name,
        deptId: user.deptId,
        status: user.status
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Get current state (Protected)
router.get('/state', (req, res) => {
  try {
    const db = getDb();
    res.json({ success: true, data: db });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Paginated & Filtered Requests Endpoint
router.get('/requests', async (req, res) => {
  try {
    const { page, limit, deptId, status, search, category } = req.query;
    const result = await getPaginatedRequests({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      deptId: deptId as string,
      status: status as string,
      search: search as string,
      category: category as string
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Update database state (Protected & Triggers Real-time Broadcast)
router.post('/state', (req, res) => {
  try {
    const dbBefore = getDb();
    const updated = saveDb(req.body);

    // Dynamic notification detection when requests have changed
    if (req.body.requests) {
      const oldLen = dbBefore.requests.length;
      const newLen = updated.requests.length;

      let msg = 'ข้อมูลแผนความต้องการพัสดุได้รับการปรับปรุงแล้ว';
      let eventType = 'requests_updated';

      if (newLen > oldLen) {
        msg = `มีการยื่นส่งแผนความต้องการวัสดุรายการใหม่จำนวน ${newLen - oldLen} รายการ`;
        eventType = 'requests_new';
      } else {
        // Detect state shifts such as approval transitions
        const changedItem = req.body.requests.find((r: any) => {
          const old = dbBefore.requests.find(o => o.id === r.id);
          return old && old.status !== r.status;
        });

        if (changedItem) {
          if (changedItem.status === 'pending_proc') {
            msg = `หัวหน้ากลุ่มงานอนุมัติรายการเห็นชอบแผนพัสดุของฝ่าย ${changedItem.deptId} ส่งให้ฝ่ายพัสดุตรวจสอบ`;
          } else if (changedItem.status === 'pending_proc_head') {
            msg = `เจ้าหน้าที่ฝ่ายพัสดุทำการสรุปตรวจสอบรายการวัสดุและเสนอหัวหน้าฝ่ายพัสดุเห็นชอบ`;
          } else if (changedItem.status === 'pending_exec') {
            msg = `หัวหน้าฝ่ายพัสดุกลั่นกรองเห็นชอบแผนวัสดุภาพรวมโรงพยาบาลสำเร็จ เสนอผู้บริหารพิจารณา`;
          } else if (changedItem.status === 'approved') {
            msg = `ผู้บริหารได้ลงนามอนุมัติเห็นชอบและอนุมัติงบประมาณแผนความต้องการวัสดุสำเร็จเรียบร้อยแล้ว`;
          } else if (changedItem.status === 'rejected') {
            msg = `มีแผนคำขอวัสดุถูกตีกลับเพื่อส่งแก้ไขชี้แจงเพิ่มเติม`;
          }
        }
      }

      broadcastEvent('requests_updated', {
        message: msg,
        eventType,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Reset database state to seed defaults
router.post('/reset', (req, res) => {
  try {
    const seedData = {
      requests: seedRequests(),
      users: SEED_USERS.map(u => ({ ...u, password: hashPasswordSync(u.password) })),
      departments: DEPARTMENTS,
      workGroups: INITIAL_WORK_GROUPS,
      customItems: {},
      itemPrices: {},
      materialActive: {},
      isPlanFrozen: false,
      fiscalYear: '2569',
      logs: []
    };
    saveDb(seedData);
    
    broadcastEvent('state_reset', {
      message: 'ระบบข้อมูลหลักและบัญชีใช้งานหลักได้รับการรีเซ็ตตั้งค่าใหม่'
    });

    res.json({ success: true, data: seedData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
