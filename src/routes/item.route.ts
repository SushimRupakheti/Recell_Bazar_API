import { Router } from "express";
import { ItemController } from "../controllers/item.controller";
import { authorizedMiddleWare } from "../middlewares/authorized.middleware";

const router = Router();
const itemController = new ItemController();

// Create Item (Protected)
router.post("/", authorizedMiddleWare, (req, res) =>
  itemController.createItem(req, res)
);

// Public Routes
router.get("/", (req, res) => itemController.getAllItems(req, res));
router.get("/:id", (req, res) => itemController.getItemById(req, res));

export default router;
