export interface PreferenceItemDto {
  notificationType: string;
  enabled: boolean;
}

export interface UserPreferenceResponseDto {
  notificationType: string;
  category?: string;
  enabled: boolean;
  isMandatory: boolean;
  description?: string;
}

export interface UpdatePreferencesDto {
  preferences: PreferenceItemDto[];
}
