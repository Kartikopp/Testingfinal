import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

declare module "express-session" {
  interface SessionData {
    adminId: number;
  }
}

const db = new Database("gupta_classes.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    customer_email TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses (id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

// Seed data if empty
const courseCount = db.prepare("SELECT COUNT(*) as count FROM courses").get() as { count: number };
if (courseCount.count === 0) {
  const insert = db.prepare("INSERT INTO courses (title, description, price, image_url, category) VALUES (?, ?, ?, ?, ?)");
  insert.run("Mathematics for JEE", "Comprehensive math course for JEE Mains and Advanced.", 4999, "https://picsum.photos/seed/math/800/600", "Engineering");
  insert.run("Physics Foundation", "Build strong physics concepts for class 11th and 12th.", 3999, "https://picsum.photos/seed/physics/800/600", "School");
  insert.run("Chemistry Mastery", "Organic, Inorganic, and Physical chemistry simplified.", 4499, "https://picsum.photos/seed/chemistry/800/600", "Engineering");
  insert.run("Biology for NEET", "Detailed biology lectures for NEET aspirants.", 5499, "https://picsum.photos/seed/biology/800/600", "Medical");
  insert.run("English Grammar Pro", "Master English grammar for competitive exams and school.", 1999, "https://picsum.photos/seed/english/800/600", "Language");
  insert.run("Computer Science Basics", "Introduction to programming and computer fundamentals.", 2999, "https://picsum.photos/seed/cs/800/600", "Technology");
  insert.run("Aptitude & Reasoning", "Critical thinking and problem solving for all competitive exams.", 2499, "https://picsum.photos/seed/logic/800/600", "General");
  insert.run("Social Studies Class 10", "Complete coverage of History, Geography, Civics, and Economics.", 3499, "https://picsum.photos/seed/history/800/600", "School");
}

const adminCount = db.prepare("SELECT COUNT(*) as count FROM admins").get() as { count: number };
if (adminCount.count === 0) {
  db.prepare("INSERT INTO admins (username, password) VALUES (?, ?)").run("admin", "admin123");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(session({
    secret: "gupta-classes-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));

  // Auth Middleware
  const isAdmin = (req: any, res: any, next: any) => {
    if (req.session.adminId) {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // Auth Routes
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    const admin = db.prepare("SELECT * FROM admins WHERE username = ? AND password = ?").get(username, password) as any;
    if (admin) {
      req.session.adminId = admin.id;
      res.json({ success: true, username: admin.username });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/admin/me", (req, res) => {
    if (req.session.adminId) {
      const admin = db.prepare("SELECT username FROM admins WHERE id = ?").get(req.session.adminId) as any;
      res.json({ username: admin.username });
    } else {
      res.status(401).json({ error: "Not logged in" });
    }
  });

  // Public API Routes
  app.get("/api/courses", (req, res) => {
    const courses = db.prepare("SELECT * FROM courses").all();
    res.json(courses);
  });

  app.get("/api/courses/:id", (req, res) => {
    const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id);
    if (course) {
      res.json(course);
    } else {
      res.status(404).json({ error: "Course not found" });
    }
  });

  app.post("/api/orders", (req, res) => {
    const { courseId, email, amount } = req.body;
    const info = db.prepare("INSERT INTO orders (course_id, customer_email, amount, status) VALUES (?, ?, ?, 'pending')").run(courseId, email, amount);
    res.json({ orderId: info.lastInsertRowid });
  });

  app.get("/api/orders/:id/status", (req, res) => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ status: order.status });
  });

  app.post("/api/orders/:id/verify", (req, res) => {
    const orderId = req.params.id;
    const { utr } = req.body;
    
    // Simulate verification logic
    // If UTR is a valid 12-digit number, it's a guaranteed success
    const is12DigitUtr = utr && /^\d{12}$/.test(utr);
    const isValidUtr = utr && utr.length >= 10;
    const isSuccess = is12DigitUtr || (isValidUtr ? Math.random() > 0.1 : Math.random() > 0.5);
    
    const newStatus = isSuccess ? 'completed' : 'failed';
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(newStatus, orderId);
    
    setTimeout(() => {
      res.json({ status: newStatus });
    }, 2500);
  });

  // Admin Protected Routes
  app.get("/api/admin/orders", isAdmin, (req, res) => {
    const orders = db.prepare(`
      SELECT orders.*, courses.title as course_title 
      FROM orders 
      JOIN courses ON orders.course_id = courses.id 
      ORDER BY created_at DESC
    `).all();
    res.json(orders);
  });

  app.post("/api/admin/courses", isAdmin, (req, res) => {
    const { title, description, price, image_url, category } = req.body;
    const info = db.prepare("INSERT INTO courses (title, description, price, image_url, category) VALUES (?, ?, ?, ?, ?)").run(title, description, price, image_url, category);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/admin/courses/:id", isAdmin, (req, res) => {
    const { title, description, price, image_url, category } = req.body;
    db.prepare("UPDATE courses SET title = ?, description = ?, price = ?, image_url = ?, category = ? WHERE id = ?").run(title, description, price, image_url, category, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/courses/:id", isAdmin, (req, res) => {
    db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
