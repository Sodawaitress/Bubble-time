import express from 'express';
import path from 'path';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ---- Events API ----
app.get('/api/events', async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string, to?: string };
    const where: any = {};
    if (from && to) {
      where.AND = [
        { end:   { gte: new Date(from) } },
        { start: { lte: new Date(to) } }
      ];
    }
    const events = await prisma.event.findMany({ where, orderBy: { start: 'asc' } });
    res.json(events);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const data = req.body;
    const created = await prisma.event.create({ data });
    res.json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.event.update({ where: { id }, data });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.event.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Prefs API ---- (single-user: the first row acts as global prefs)
app.get('/api/prefs', async (_req, res) => {
  const first = await prisma.userPrefs.findFirst();
  res.json(first ?? { slotMinTime: process.env.SLOT_MIN_TIME || "07:40:00", slotMaxTime: process.env.SLOT_MAX_TIME || "22:00:00", weekStartsOn: 1 });
});

app.patch('/api/prefs', async (req, res) => {
  const existing = await prisma.userPrefs.findFirst();
  const data = req.body;
  const saved = existing
    ? await prisma.userPrefs.update({ where: { id: existing.id }, data })
    : await prisma.userPrefs.create({ data });
  res.json(saved);
});

// ---- Serve front-end ----
const distPath = path.join(process.cwd(), 'dist');
const indexHtml = path.join(distPath, 'index.html');
app.use(express.static(distPath));
app.get('*', (_req, res) => res.sendFile(indexHtml));

app.listen(PORT, () => {
  console.log('Server running on http://0.0.0.0:' + PORT);
});
