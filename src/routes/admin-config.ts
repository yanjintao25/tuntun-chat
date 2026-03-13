import { Router, Request, Response } from "express";
import { getFeatureConfig, setFeatureConfig, type FeatureConfig } from "../config/store";

const router = Router();

/**
 * GET /admin/config
 * 获取当前功能配置
 */
router.get("/", (_req: Request, res: Response) => {
  try {
    const config = getFeatureConfig();
    res.json({ ok: true, config });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

/**
 * PUT /admin/config
 * 更新功能配置（部分更新）
 * Body: { schedule?: { enabled?, defaultCalendarId? }, todo?: { enabled?, reminderMinutes? }, dailySummary?: { enabled?, summaryTime?, scope? } }
 */
router.put("/", (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<FeatureConfig>;
    const config = setFeatureConfig(body);
    res.json({ ok: true, config });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

export { router as adminConfigRouter };
