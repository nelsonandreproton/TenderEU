// TenderEU Frontend Application

const API_BASE = '';

// DOM Elements
const countrySelect = document.getElementById('country-select');
const limitSelect = document.getElementById('limit-select');
const searchBtn = document.getElementById('search-btn');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const tendersListEl = document.getElementById('tenders-list');
const resultsCountEl = document.getElementById('results-count');

// Initialize application
async function init() {
  await loadCountries();
  searchBtn.addEventListener('click', handleSearch);

  // Initial search on page load
  handleSearch();
}

// Load countries from API
async function loadCountries() {
  try {
    const response = await fetch(`${API_BASE}/api/countries`);
    const countries = await response.json();

    countrySelect.innerHTML = countries
      .map(c => `<option value="${c.code}">${c.name}</option>`)
      .join('');
  } catch (error) {
    console.error('Failed to load countries:', error);
    countrySelect.innerHTML = '<option value="">Failed to load countries</option>';
  }
}

// Handle search button click
async function handleSearch() {
  const selectedCountries = Array.from(countrySelect.selectedOptions)
    .map(opt => opt.value)
    .filter(Boolean);
  const limit = limitSelect.value;

  showLoading();
  hideError();
  clearResults();

  try {
    const params = new URLSearchParams();
    if (selectedCountries.length > 0) {
      params.append('countries', selectedCountries.join(','));
    }
    params.append('limit', limit);

    const response = await fetch(`${API_BASE}/api/tenders?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch tenders');
    }

    const data = await response.json();
    renderTenders(data.tenders);
    updateResultsCount(data.tenders.length);
  } catch (error) {
    console.error('Search error:', error);
    showError('Failed to fetch tenders. Please try again.');
  } finally {
    hideLoading();
  }
}

// Render tenders list
function renderTenders(tenders) {
  if (tenders.length === 0) {
    tendersListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No tenders found</h3>
        <p>Try adjusting your filters or selecting different countries.</p>
      </div>
    `;
    return;
  }

  tendersListEl.innerHTML = tenders.map((tender, index) => renderTenderCard(tender, index)).join('');

  // Add event listeners for requirement toggles
  document.querySelectorAll('.requirements-toggle').forEach(btn => {
    btn.addEventListener('click', toggleRequirements);
  });
}

// Render single tender card
function renderTenderCard(tender, index) {
  const valueDisplay = tender.estimatedValue
    ? `€${tender.estimatedValue.amount.toLocaleString()}`
    : 'Not specified';

  const deadlineClass = isDeadlineUrgent(tender.deadline) ? 'deadline-urgent' : '';

  const cpvTags = tender.cpvCodes.slice(0, 3).map(cpv =>
    `<span class="tag tag-cpv" title="${cpv.description}">${cpv.code}</span>`
  ).join('');

  const requirementsHtml = renderRequirements(tender.requirements, index);

  return `
    <article class="tender-card">
      <header class="tender-header">
        <h3 class="tender-title">${escapeHtml(tender.title)}</h3>
        <div class="tender-meta">
          <span class="tender-meta-item">
            <span>🏢</span>
            ${escapeHtml(tender.buyerName)}
          </span>
          <span class="tender-meta-item">
            <span>📍</span>
            ${escapeHtml(tender.buyerCountry)}
          </span>
          <span class="tender-meta-item">
            <span>📋</span>
            ${tender.contractType || 'Services'}
          </span>
        </div>
      </header>

      <div class="tender-body">
        <p class="tender-description">${escapeHtml(tender.description || 'No description available.')}</p>

        <div class="tender-tags">
          <span class="tag tag-country">${escapeHtml(tender.buyerCountry)}</span>
          <span class="tag tag-value">${valueDisplay}</span>
          ${cpvTags}
        </div>

        ${requirementsHtml}
      </div>

      <footer class="tender-footer">
        <div class="tender-dates">
          <div class="date-item">
            <span class="date-label">Published</span>
            <span class="date-value">${formatDate(tender.publishedDate)}</span>
          </div>
          ${tender.deadline ? `
            <div class="date-item">
              <span class="date-label">Deadline</span>
              <span class="date-value ${deadlineClass}">${formatDate(tender.deadline)}</span>
            </div>
          ` : ''}
        </div>
        <a href="${tender.tedUrl}" target="_blank" rel="noopener" class="tender-link">
          View on TED
          <span>↗</span>
        </a>
      </footer>
    </article>
  `;
}

// Render requirements section
function renderRequirements(requirements, index) {
  if (!requirements || requirements.length === 0) {
    return '';
  }

  const categoriesHtml = requirements.map(section => `
    <div class="requirement-category">
      <h4>${escapeHtml(section.category)}</h4>
      <ul>
        ${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  return `
    <div class="requirements-section">
      <button class="requirements-toggle" data-index="${index}">
        <span>Detailed Requirements</span>
        <span class="toggle-icon">▼</span>
      </button>
      <div class="requirements-content" id="requirements-${index}">
        ${categoriesHtml}
      </div>
    </div>
  `;
}

// Toggle requirements visibility
function toggleRequirements(event) {
  const btn = event.currentTarget;
  const index = btn.dataset.index;
  const content = document.getElementById(`requirements-${index}`);
  const icon = btn.querySelector('.toggle-icon');

  content.classList.toggle('open');
  icon.classList.toggle('open');
}

// Helper functions
function showLoading() {
  loadingEl.classList.remove('hidden');
  searchBtn.disabled = true;
}

function hideLoading() {
  loadingEl.classList.add('hidden');
  searchBtn.disabled = false;
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function hideError() {
  errorEl.classList.add('hidden');
}

function clearResults() {
  tendersListEl.innerHTML = '';
  resultsCountEl.textContent = '';
}

function updateResultsCount(count) {
  resultsCountEl.textContent = `${count} tender${count !== 1 ? 's' : ''} found`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function isDeadlineUrgent(dateStr) {
  if (!dateStr) return false;

  try {
    const deadline = new Date(dateStr);
    const today = new Date();
    const daysUntil = (deadline - today) / (1000 * 60 * 60 * 24);
    return daysUntil <= 7 && daysUntil >= 0;
  } catch {
    return false;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
