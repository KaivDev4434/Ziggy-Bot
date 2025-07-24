import request from 'supertest';
import { Express } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../../src/models';
import TestFixtures from '../../fixtures';
import app from '../../../src/app';

// Mock bcrypt and jwt for predictable testing
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthController', () => {
  let testApp: Express;

  beforeAll(() => {
    testApp = app;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      mockedBcrypt.hash.mockResolvedValue('hashedPassword123');
      mockedJwt.sign.mockReturnValue('mockToken123');

      const response = await request(testApp)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.data.token).toBe('mockToken123');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        password: '123' // Too short
      };

      const response = await request(testApp)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
      expect(response.body.errors).toBeDefined();
    });

    it('should reject duplicate email addresses', async () => {
      const userData = TestFixtures.createMockUser();
      
      // Create user first
      await new User(userData).save();

      const response = await request(testApp)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: userData.email,
          password: 'Password123!'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should handle bcrypt errors gracefully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      mockedBcrypt.hash.mockRejectedValue(new Error('Bcrypt error') as any);

      const response = await request(testApp)
        .post('/api/auth/register')
        .send(userData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser: any;

    beforeEach(async () => {
      const userData = TestFixtures.createMockUser({
        password: 'hashedPassword123'
      });
      testUser = await new User(userData).save();
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'password123'
      };

      mockedBcrypt.compare.mockResolvedValue(true);
      mockedJwt.sign.mockReturnValue('mockToken123');

      const response = await request(testApp)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.data.token).toBe('mockToken123');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(testApp)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      mockedBcrypt.compare.mockResolvedValue(false);

      const response = await request(testApp)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should validate login input', async () => {
      const invalidData = {
        email: 'not-an-email',
        password: ''
      };

      const response = await request(testApp)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should update last login timestamp', async () => {
      const loginData = {
        email: testUser.email,
        password: 'password123'
      };

      mockedBcrypt.compare.mockResolvedValue(true);
      mockedJwt.sign.mockReturnValue('mockToken123');

      const beforeLogin = testUser.lastLoginAt;

      await request(testApp)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser!.lastLoginAt).toBeDefined();
      expect(updatedUser!.lastLoginAt!.getTime()).toBeGreaterThan(
        beforeLogin ? beforeLogin.getTime() : 0
      );
    });
  });

  describe('GET /api/auth/profile', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userData = TestFixtures.createMockUser();
      testUser = await new User(userData).save();
      authToken = 'Bearer mockToken123';

      // Mock JWT verification
      mockedJwt.verify.mockReturnValue({
        id: testUser._id.toString(),
        email: testUser.email
      } as any);
    });

    it('should return user profile with valid token', async () => {
      const response = await request(testApp)
        .get('/api/auth/profile')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(testApp)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Authentication required');
    });

    it('should reject request with invalid token', async () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(testApp)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidToken')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userData = TestFixtures.createMockUser();
      testUser = await new User(userData).save();
      authToken = 'Bearer mockToken123';

      mockedJwt.verify.mockReturnValue({
        id: testUser._id.toString(),
        email: testUser.email
      } as any);
    });

    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        preferences: {
          timezone: 'EST',
          theme: 'dark'
        }
      };

      const response = await request(testApp)
        .put('/api/auth/profile')
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe(updateData.name);
      expect(response.body.data.user.preferences.timezone).toBe(updateData.preferences.timezone);
    });

    it('should validate update data', async () => {
      const invalidData = {
        name: '', // Empty name
        email: 'invalid-email'
      };

      const response = await request(testApp)
        .put('/api/auth/profile')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should not allow email changes to existing emails', async () => {
      // Create another user
      const anotherUser = await new User(TestFixtures.createMockUser({
        email: 'another@example.com'
      })).save();

      const updateData = {
        email: anotherUser.email
      };

      const response = await request(testApp)
        .put('/api/auth/profile')
        .set('Authorization', authToken)
        .send(updateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already exists');
    });
  });

  describe('POST /api/auth/change-password', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userData = TestFixtures.createMockUser({
        password: 'hashedOldPassword'
      });
      testUser = await new User(userData).save();
      authToken = 'Bearer mockToken123';

      mockedJwt.verify.mockReturnValue({
        id: testUser._id.toString(),
        email: testUser.email
      } as any);
    });

    it('should change password with valid current password', async () => {
      const passwordData = {
        currentPassword: 'oldPassword',
        newPassword: 'NewPassword123!'
      };

      mockedBcrypt.compare.mockResolvedValue(true);
      mockedBcrypt.hash.mockResolvedValue('hashedNewPassword');

      const response = await request(testApp)
        .post('/api/auth/change-password')
        .set('Authorization', authToken)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');
    });

    it('should reject invalid current password', async () => {
      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'NewPassword123!'
      };

      mockedBcrypt.compare.mockResolvedValue(false);

      const response = await request(testApp)
        .post('/api/auth/change-password')
        .set('Authorization', authToken)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
    });

    it('should validate new password strength', async () => {
      const passwordData = {
        currentPassword: 'oldPassword',
        newPassword: '123' // Too weak
      };

      const response = await request(testApp)
        .post('/api/auth/change-password')
        .set('Authorization', authToken)
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userData = TestFixtures.createMockUser();
      testUser = await new User(userData).save();
      authToken = 'Bearer mockToken123';

      mockedJwt.verify.mockReturnValue({
        id: testUser._id.toString(),
        email: testUser.email
      } as any);
    });

    it('should refresh token with valid current token', async () => {
      mockedJwt.sign.mockReturnValue('newMockToken456');

      const response = await request(testApp)
        .post('/api/auth/refresh-token')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBe('newMockToken456');
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(testApp)
        .post('/api/auth/refresh-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userData = TestFixtures.createMockUser();
      testUser = await new User(userData).save();
      authToken = 'Bearer mockToken123';

      mockedJwt.verify.mockReturnValue({
        id: testUser._id.toString(),
        email: testUser.email
      } as any);
    });

    it('should logout successfully', async () => {
      const response = await request(testApp)
        .post('/api/auth/logout')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });

    it('should work even without token (idempotent)', async () => {
      const response = await request(testApp)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/auth/delete-account', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      const userData = TestFixtures.createMockUser({
        password: 'hashedPassword123'
      });
      testUser = await new User(userData).save();
      authToken = 'Bearer mockToken123';

      mockedJwt.verify.mockReturnValue({
        id: testUser._id.toString(),
        email: testUser.email
      } as any);
    });

    it('should delete account with valid password', async () => {
      const deleteData = {
        password: 'password123'
      };

      mockedBcrypt.compare.mockResolvedValue(true);

      const response = await request(testApp)
        .delete('/api/auth/delete-account')
        .set('Authorization', authToken)
        .send(deleteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Account deleted successfully');

      // Verify user is actually deleted
      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should reject deletion with invalid password', async () => {
      const deleteData = {
        password: 'wrongPassword'
      };

      mockedBcrypt.compare.mockResolvedValue(false);

      const response = await request(testApp)
        .delete('/api/auth/delete-account')
        .set('Authorization', authToken)
        .send(deleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Password is incorrect');

      // Verify user still exists
      const existingUser = await User.findById(testUser._id);
      expect(existingUser).not.toBeNull();
    });

    it('should require password for account deletion', async () => {
      const response = await request(testApp)
        .delete('/api/auth/delete-account')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });
  });

  describe('rate limiting', () => {
    it('should apply rate limiting to login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() =>
        request(testApp)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(User, 'findOne').mockRejectedValue(new Error('Database connection failed'));

      const response = await request(testApp)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle JWT signing errors gracefully', async () => {
      const userData = TestFixtures.createMockUser();
      await new User(userData).save();

      mockedBcrypt.hash.mockResolvedValue('hashedPassword123');
      mockedJwt.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      const response = await request(testApp)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
}); 