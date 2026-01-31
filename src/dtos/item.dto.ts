export interface CreateItemDTO {
  photos: string[];

  category: string;
  model: string;

  finalPrice: string;
  basePrice: string;

  year: number;
  batteryHealth: number;
  description: string;

  deviceCondition: string;
  chargerAvailable: boolean;

  factoryUnlock: boolean;
  liquidDamage: boolean;
  switchOn: boolean;
  receiveCall: boolean;

  features1Condition: boolean;
  features2Condition: boolean;

  cameraCondition: boolean;
  displayCondition: boolean;
  displayCracked: boolean;
  displayOriginal: boolean;
}

