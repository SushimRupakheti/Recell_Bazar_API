import { ItemModel } from "../models/item.model";
import { CreateItemDTO } from "../dtos/item.dto";

export class ItemService {
  async createItem(sellerId: string, data: CreateItemDTO) {
    const item = await ItemModel.create({
      sellerId,
      ...data,
    } as any);

    return item;
  }

  async getAllItems() {
    return await ItemModel.find()
      .populate("sellerId", "firstName lastName profileImage")
      .sort({ createdAt: -1 });
  }

  async getItemById(id: string) {
    return await ItemModel.findById(id).populate(
      "sellerId",
      "firstName lastName contactNo"
    );
  }
}
