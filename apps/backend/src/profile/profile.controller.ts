import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { UserProfile } from '../../../types/src';

@Controller('profile')
export class ProfileController {
  private userProfile: UserProfile | null = {
    userName: 'Alex',
    interests: ['Tech', 'Travel'],
    learningLevel: 'Intermediate',
    recentCorrections: [
      {
        original: 'I am go to school.',
        corrected: 'I am going to school.',
        timestamp: '2023-10-27T10:00:00Z',
      },
    ],
  };

  @Get()
  getProfile(): UserProfile {
    if (!this.userProfile) {
      throw new NotFoundException('User profile not found.');
    }
    return this.userProfile;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createProfile(
    @Body() profile: Omit<UserProfile, 'recentCorrections'>,
  ): UserProfile {
    this.userProfile = {
      ...profile,
      recentCorrections: [],
    };
    return this.userProfile;
  }
}
