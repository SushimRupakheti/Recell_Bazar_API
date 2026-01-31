import { Request, Response } from "express";
import { ItemService } from "../services/item.services";
import { HttpError } from "../errors/http-error";



export class ItemController {
    private itemService: ItemService;

  constructor() {
    this.itemService = new ItemService();
  }
  async createItem(req: Request, res: Response) {
    try {
      if (!req.user)
        throw new HttpError(401, "Unauthorized, User Not Found");

      const sellerId = req.user._id;

      const item = await this.itemService.createItem(sellerId.toString(), req.body);

      return res.status(201).json({
        success: true,
        message: "Item created successfully",
        item,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Item creation failed",
      });
    }
  }

  async getAllItems(req: Request, res: Response) {
    try {
      const items = await this.itemService.getAllItems();

      return res.status(200).json({
        success: true,
        items,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to fetch items",
      });
    }
  }

  async getItemById(req: Request, res: Response) {
    try {
      const item = await this.itemService.getItemById(req.params.id);

      if (!item) throw new HttpError(404, "Item not found");

      return res.status(200).json({
        success: true,
        item,
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to fetch item",
      });
    }
  }
}
