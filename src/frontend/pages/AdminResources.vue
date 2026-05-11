<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">
        <div class="search-row">
          <h2>Resource Management</h2>
          <button @click="loadResources" class="chip" type="button" :disabled="isLoading">
            {{ isLoading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>
        
        <div class="search-row">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search by title or uploader..." 
          />
        </div>
        
        <p v-if="adminMessage" class="message">{{ adminMessage }}</p>
        
        <div id="resourcesList" class="list">
          <div v-if="isLoading" class="empty-state">Loading resources...</div>
          <div v-else-if="filteredResources.length === 0" class="empty-state">No resources found.</div>
          
          <div v-else v-for="resource in filteredResources" :key="resource.id" class="item">
            <strong>{{ resource.title || 'Untitled Resource' }}</strong>
            <div class="meta">Uploader: {{ resource.uploader_name ? `${resource.uploader_name} (${resource.uploader_email || 'Unknown'})` : 'Unknown' }}</div>
            <div class="meta">Course: {{ resource.course_code || 'N/A' }}</div>
            <div class="meta">Type: {{ resource.resource_type || 'miscellaneous' }}</div>
            <div class="meta">Uploaded: {{ formatDate(resource.created_at) }}</div>
            
            <div v-if="resource.file_url" class="meta">
              <a :href="resource.file_url" target="_blank" rel="noopener noreferrer">📎 Download</a>
            </div>
            
            <div v-if="resource.link_url" class="meta">
              <a :href="resource.link_url" target="_blank" rel="noopener noreferrer">🔗 External Link</a>
            </div>
            
            <div class="actions">
              <button 
                type="button" 
                class="delete-btn"
                @click="deleteResource(resource.id, resource.title)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api, requireRoleSession } from '@/api.js'; // Adjust the import path if needed

// State Variables
const allResources = ref([]);
const searchQuery = ref('');
const adminMessage = ref('');
const isLoading = ref(true);

// Replaces the vanilla JS filter function and debounce.
// This automatically updates the list on the screen whenever searchQuery changes.
const filteredResources = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  
  if (!query) {
    return allResources.value;
  }
  
  return allResources.value.filter(resource => {
    const title = (resource.title || '').toLowerCase();
    const uploader = (resource.uploader_name || '').toLowerCase();
    const email = (resource.uploader_email || '').toLowerCase();
    
    return title.includes(query) || uploader.includes(query) || email.includes(query);
  });
});

// Formatting Date
const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return dateString;
  }
};

// Fetch resources from the API
const loadResources = async () => {
  isLoading.value = true;
  adminMessage.value = '';

  try {
    const response = await api('/admin/resources');
    allResources.value = response.resources || [];
  } catch (error) {
    adminMessage.value = `Error loading resources: ${error.message}`;
    allResources.value = [];
  } finally {
    isLoading.value = false;
  }
};

// Delete resource logic
const deleteResource = async (id, fileName) => {
  const confirmed = confirm(`Delete resource "${fileName}"? This action cannot be undone.`);
  if (!confirmed) return;

  adminMessage.value = '';
  
  try {
    await api(`/resources/${id}`, 'DELETE');
    adminMessage.value = 'Resource deleted successfully.';
    
    // Refresh the list after successful deletion
    await loadResources();
    
    // Optional: Auto-clear success message after 3 seconds
    setTimeout(() => {
      if (adminMessage.value === 'Resource deleted successfully.') {
        adminMessage.value = '';
      }
    }, 3000);
    
  } catch (error) {
    adminMessage.value = error.message || 'Failed to delete resource.';
  }
};

// Lifecycle Hooks (Runs when the page loads)
onMounted(() => {
  requireRoleSession('admin');
  loadResources();
});
</script>

<style scoped>
/* Scoped ensures these styles only apply to the Admin Resources page */

.search-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 10px;
}

.search-row input {
  flex-grow: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.delete-btn {
  background-color: #e74c3c;
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background-color: #c0392b;
}

/* Imported from admin-verifications.css and adjusted for the resources list */
#resourcesList .item {
  border-left: 5px solid #325274;
  padding: 12px;
  margin-bottom: 12px;
  background: white;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

#resourcesList .meta {
  font-size: 0.9em;
  color: #555;
  margin-top: 4px;
}

#resourcesList .meta a {
  color: #1e4e7c;
  font-weight: 700;
  text-decoration: none;
}

#resourcesList .meta a:hover {
  text-decoration: underline;
}

#resourcesList .status-available {
  color: #1f7a4d;
  font-weight: 700;
}

#resourcesList .status-missing {
  color: #b23a2d;
  font-weight: 700;
}

#resourcesList .proof-unavailable {
  color: #7d8790;
  font-style: italic;
}

#resourcesList .warn-btn {
  border: 1px solid #d2a53b;
  background: #fff7e2;
  color: #7b5600;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

#resourcesList .warn-btn:hover {
  background: #ffe9b7;
  border-color: #c48e12;
}

.actions {
  margin-top: 10px;
}

.message {
  color: #e74c3c;
  font-weight: 500;
  margin-bottom: 10px;
}

/* Base styles for the layout structure if base.css isn't globally loaded yet */
.page-bg {
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f7fa;
}

.phone-shell {
  max-width: 600px;
  margin: 0 auto;
}
</style>