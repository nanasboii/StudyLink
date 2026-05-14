import { api, debounce, requireRoleSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

requireRoleSession('admin');

mountNav('adminResources');

const list = document.getElementById('resourcesList');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
let allResources = [];

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return dateString;
  }
}

async function deleteResource(id, fileName) {
  const confirmed = confirm(`Delete resource "${fileName}"? This action cannot be undone.`);
  if (!confirmed) return;

  setMessage('adminMessage', '');
  try {
    await api(`/resources/${id}`, 'DELETE');
    setMessage('adminMessage', `Resource deleted successfully.`, true);
    await loadResources();
  } catch (error) {
    setMessage('adminMessage', error.message);
  }
}

function renderCard(resource) {
  const card = document.createElement('div');
  card.className = 'item';
  
  const uploadedBy = resource.uploader_name ? `${resource.uploader_name} (${resource.uploader_email || 'Unknown'})` : 'Unknown';
  const uploadedDate = formatDate(resource.created_at);
  const resourceType = resource.resource_type || 'miscellaneous';
  
  card.innerHTML = `
    <strong>${resource.title || 'Untitled Resource'}</strong>
    <div class="meta">Uploader: ${uploadedBy}</div>
    <div class="meta">Course: ${resource.course_code || 'N/A'}</div>
    <div class="meta">Type: ${resourceType}</div>
    <div class="meta">Uploaded: ${uploadedDate}</div>
    ${resource.file_url ? `<div class="meta"><a href="${resource.file_url}" target="_blank" rel="noopener noreferrer">📎 Download</a></div>` : ''}
    ${resource.link_url ? `<div class="meta"><a href="${resource.link_url}" target="_blank" rel="noopener noreferrer">🔗 External Link</a></div>` : ''}
    <div class="actions"></div>
  `;

  const actions = card.querySelector('.actions');
  
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.textContent = 'Delete';
  deleteBtn.style.backgroundColor = '#e74c3c';
  deleteBtn.addEventListener('click', () => deleteResource(resource.id, resource.title));

  actions.appendChild(deleteBtn);

  return card;
}

function renderResources(resources) {
  list.innerHTML = '';

  if (!resources.length) {
    list.innerHTML = '<div class="empty-state">No resources found.</div>';
    return;
  }

  resources.forEach((resource) => list.appendChild(renderCard(resource)));
}

function filterResources() {
  const query = searchInput.value.toLowerCase();
  
  const filtered = allResources.filter(resource => {
    const title = (resource.title || '').toLowerCase();
    const uploader = (resource.uploader_name || '').toLowerCase();
    const email = (resource.uploader_email || '').toLowerCase();
    
    return title.includes(query) || uploader.includes(query) || email.includes(query);
  });

  renderResources(filtered);
}

async function loadResources() {
  list.innerHTML = '<div class="empty-state">Loading resources...</div>';

  try {
    const response = await api('/admin/resources');
    allResources = response.resources || [];
    filterResources();
  } catch (error) {
    list.innerHTML = `<div class="empty-state">Error loading resources: ${error.message}</div>`;
  }
}

refreshBtn.addEventListener('click', loadResources);
searchInput.addEventListener('input', debounce(filterResources, 300));

loadResources();
