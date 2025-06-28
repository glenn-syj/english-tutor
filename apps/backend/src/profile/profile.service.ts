import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { UserProfile } from '../../../types/src';

@Injectable()
export class ProfileService {
  constructor(private readonly storageService: StorageService) {}

  async getProfile(): Promise<UserProfile> {
    let userProfile = await this.storageService.readUserProfile();
    if (!userProfile) {
      // If no profile exists, create a default one
      const defaultProfile: UserProfile = {
        name: 'New User',
        interests: ['technology', 'news', 'language learning'],
        learningLevel: 'intermediate',
        recentCorrections: [],
      };
      await this.storageService.writeUserProfile(defaultProfile);
      userProfile = defaultProfile;
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
