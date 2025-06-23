import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { UserProfile } from '../../../types/src';

@Injectable()
export class ProfileService {
  constructor(private readonly storageService: StorageService) {}

  async getProfile(): Promise<UserProfile> {
    const userProfile = await this.storageService.readUserProfile();
    if (!userProfile) {
      throw new NotFoundException('User profile not found.');
    }
    return userProfile;
  }

  async createOrUpdateProfile(
    profileDto: Omit<UserProfile, 'recentCorrections'>,
  ): Promise<UserProfile> {
    const currentProfile = await this.storageService.readUserProfile();

    const newProfile: UserProfile = {
      ...profileDto,
      recentCorrections: currentProfile?.recentCorrections ?? [],
    };

    await this.storageService.writeUserProfile(newProfile);
    return newProfile;
  }
}
