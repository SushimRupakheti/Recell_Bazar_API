import mongoose, { Document, Schema } from "mongoose";
import { ItemType } from "../types/item.type"; 

const itemSchema: Schema = new Schema(
  {
    sellerId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },

    photos: {
      type: [String],
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    phoneModel: {
      type: String,
      required: true,
    },

    finalPrice: {
      type: String,
      required: true,
    },

    basePrice: {
      type: String,
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },

    batteryHealth: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },
    
    chargerAvailable: {
      type: Boolean,
      default: true,
    },

    factoryUnlock: {
      type: Boolean,
      default: true,
    },

    liquidDamage: {
      type: Boolean,
      default: false,
    },

    switchOn: {
      type: Boolean,
      default: true,
    },

    receiveCall: {
      type: Boolean,
      default: true,
    },

    features1Condition: {
      type: Boolean,
      default: true,
    },

    features2Condition: {
      type: Boolean,
      default: true,
    },

    cameraCondition: {
      type: Boolean,
      default: true,
    },

    displayCondition: {
      type: Boolean,
      default: true,
    },

    displayCracked: {
      type: Boolean,
      default: false,
    },

    displayOriginal: {
      type: Boolean,
      default: true,
    },

    isSold: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export interface IItem extends ItemType, Document {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const ItemModel = mongoose.model<IItem>("Item", itemSchema);
