import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { UserProfile } from '../../../types/src';

@Injectable()
export class StorageService {
  private readonly userProfilePath = path.resolve(
    __dirname,
    '..',
    'data',
    'user_profile.json',
  );

  async readUserProfile(): Promise<UserProfile | null> {
    try {
      const data = await fs.readFile(this.userProfilePath, 'utf-8');
      return JSON.parse(data) as UserProfile;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async writeUserProfile(userProfile: UserProfile): Promise<void> {
    await fs.writeFile(
      this.userProfilePath,
      JSON.stringify(userProfile, null, 2),
      'utf-8',
    );
  }
}
