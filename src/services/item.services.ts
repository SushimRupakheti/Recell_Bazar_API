import { ItemModel } from "../models/item.model";
import { CreateItemDTO } from "../dtos/item.dto";
import { HttpError } from "../errors/http-error";

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

  async getItemsByUserId(userId: string) {
    return await ItemModel.find({ sellerId: userId })
      .populate("sellerId", "firstName lastName contactNo profileImage")
      .sort({ createdAt: -1 });
  }

  async updateItem(itemId: string, userId: string, data: Partial<CreateItemDTO>) {
    const item = await ItemModel.findById(itemId);
    if (!item) throw new HttpError(404, "Item not found");

    if (item.sellerId.toString() !== userId)
      throw new HttpError(403, "Forbidden: not the owner of the item");

    const updated = await ItemModel.findByIdAndUpdate(itemId, data as any, {
      new: true,
    });

    return updated;
  }
}
