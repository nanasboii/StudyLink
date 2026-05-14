<template>
  <div class="view page active">
    <section class="card profile-hero">
      <div class="profile-hero-top">
        <div class="profile-pic-container">
          <img :src="profileData.profilePicture || '/default-avatar.svg'" alt="Profile Picture" class="profile-pic" />
        </div>
        <div class="profile-hero-meta">
          <div>
            <h2>{{ profileData.fullName }}</h2>
            <p class="profile-sub">Student ID: {{ profileData.studentId }}</p>
          </div>
          <span class="role-badge">{{ profileData.role }}</span>
        </div>
      </div>
      <div class="profile-stats-strip">
        <div class="mini-stat-item">
          <span class="mini-stat-label">Learning Points</span>
          <span class="mini-stat-value">{{ profileData.points }}</span>
        </div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">Rating</span>
          <span class="mini-stat-value">{{ (profileData.rating || 0).toFixed(2) }}</span>
        </div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">Verified</span>
          <span class="mini-stat-value">{{ profileData.isVerified ? 'Yes' : 'No' }}</span>
        </div>
      </div>
    </section>

    <section class="card profile-panel">
      <div class="profile-header">
        <h3>Profile Information</h3>
        <button @click="toggleEdit" class="chip" type="button">{{ isEditing ? 'Cancel' : 'Edit Profile' }}</button>
      </div>
      <form @submit.prevent="saveProfile" class="profile-form">
        <div class="profile-field">
          <label class="field-label">Full Name</label>
          <input v-model="profileData.fullName" :disabled="!isEditing" />
        </div>
        <div class="profile-field">
          <label class="field-label">Email <span class="field-hint">(read-only)</span></label>
          <input :value="profileData.email" readonly />
        </div>
        <div class="profile-field">
          <label class="field-label">Phone Number</label>
          <input v-model="profileData.phoneNumber" :disabled="!isEditing" />
        </div>
        <div class="profile-field">
          <label class="field-label">Major</label>
          <input v-model="profileData.major" :disabled="!isEditing" />
        </div>
        <div class="profile-field">
          <label class="field-label">Bio</label>
          <textarea v-model="profileData.bio" :disabled="!isEditing" rows="4"></textarea>
        </div>
        <div class="profile-field" style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" id="twoFactorEnabled" v-model="profileData.twoFactorEnabled" :disabled="!isEditing" />
          <label for="twoFactorEnabled" class="field-label" style="margin-bottom: 0;">Enable Email Two-Factor Authentication (OTP)</label>
        </div>
        <div v-if="isEditing" class="edit-actions">
          <button class="primary" type="submit">Save Changes</button>
        </div>
      </form>
    </section>

    <section v-if="profileData.role === 'tutor'" class="card profile-panel" style="margin-top: 20px;">
      <div class="profile-header">
        <h3>My Availability</h3>
      </div>
      
      <div v-if="availability.length > 0" style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px;">
        <div v-for="slot in availability" :key="slot.id" style="display: flex; gap: 10px; background: #f9f9f9; padding: 10px; border-radius: 8px; align-items: center;">
          <strong style="color: #c41e3a; width: 80px;">{{ slot.day_of_week }}</strong>
          <span>{{ slot.start_time }} - {{ slot.end_time }}</span>
          <span v-if="slot.course_code" style="background: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; border: 1px solid #eee;">{{ slot.course_code }}</span>
        </div>
      </div>
      <p v-else style="color: #666; font-size: 14px; margin-bottom: 16px;">You haven't set any availability yet.</p>

      <form @submit.prevent="addAvailability" style="display: flex; gap: 10px; flex-wrap: wrap; background: #fff5f8; padding: 16px; border-radius: 8px; border: 1px solid #ffb7c5;">
        <select v-model="newSlot.dayOfWeek" required style="padding: 8px; border-radius: 6px; border: 1px solid #ccc; flex: 1; min-width: 120px;">
          <option value="" disabled>Day of Week</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
          <option value="Sunday">Sunday</option>
        </select>
        
        <input type="time" v-model="newSlot.startTime" required style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;" />
        <span style="display: flex; align-items: center;">to</span>
        <input type="time" v-model="newSlot.endTime" required style="padding: 8px; border-radius: 6px; border: 1px solid #ccc;" />
        
        <input type="text" v-model="newSlot.courseCode" placeholder="Course (Opt)" style="padding: 8px; border-radius: 6px; border: 1px solid #ccc; width: 100px;" />
        
        <button type="submit" class="chip-strong" style="margin: 0;">Add Slot</button>
      </form>
    </section>

    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script>
import { api, getUser } from '@/api.js'

export default {
  name: 'Profile',
  data() {
    const user = getUser() || {}
    return {
      isEditing: false,
      profileData: {
        fullName: (user.firstName || '') + ' ' + (user.lastName || ''),
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        major: user.major || '',
        bio: user.bio || '',
        twoFactorEnabled: user.twoFactorEnabled || false,
        studentId: user.studentId || '',
        role: user.role || '',
        points: user.points || 0,
        rating: user.rating || 0,
        isVerified: user.isVerified || false,
        profilePicture: user.profilePicture || ''
      },
      
      availability: [],
      newSlot: { dayOfWeek: '', startTime: '', endTime: '', courseCode: '' },
      message: '',
    }
  },
  
  methods: {
    toggleEdit() {
      this.isEditing = !this.isEditing
    },
    async saveProfile() {
      try {
        await api('/me/profile', 'PUT', this.profileData)
        this.message = 'Profile updated!'
        this.isEditing = false
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },

    async loadAvailability() {
      if (this.profileData.role !== 'tutor') return;
      try {
        const resp = await api('/availability/me');
        this.availability = resp.availability || [];
      } catch (err) {
        console.error("Failed to load availability", err);
      }
    },

    async addAvailability() {
      try {
        await api('/availability', 'POST', this.newSlot);
        this.message = 'Availability added!';
        this.newSlot = { dayOfWeek: '', startTime: '', endTime: '', courseCode: '' };
        this.loadAvailability(); // Refresh list
      } catch (err) {
        this.message = `Error: ${err.message}`;
      }
    },
  },
  
  mounted() {
    this.loadAvailability();
  }
}
</script>
