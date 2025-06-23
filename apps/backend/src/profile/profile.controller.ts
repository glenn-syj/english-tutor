import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { UserProfile } from '../../../types/src';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(): Promise<UserProfile> {
    return this.profileService.getProfile();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async createOrUpdateProfile(
    @Body() profile: Omit<UserProfile, 'recentCorrections'>,
  ): Promise<UserProfile> {
    return this.profileService.createOrUpdateProfile(profile);
  }
}
