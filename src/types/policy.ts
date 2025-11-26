// Request body for bulk set operation (both fields optional, at least one required).
export interface BulkPolicyBody {
  checkInHour?: number | null;
  checkOutHour?: number | null;
}

// Request body for bulk Wi-Fi update (both fields required).
export interface BulkWiFiBody {
  wifiName: string;
  wifiPassword: string;
}