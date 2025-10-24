// Use this URL to fetch NASA APOD JSON data.
const apodData = 'https://cdn.jsdelivr.net/gh/GCA-Classroom/apod/data.json';

// Get references to DOM elements
const getImageBtn = document.getElementById('getImageBtn');
const gallery = document.getElementById('gallery');

// Start date component selects
const startMonthSelect = document.getElementById('startMonth');
const startDaySelect = document.getElementById('startDay');
const startYearSelect = document.getElementById('startYear');

// End date component selects
const endMonthSelect = document.getElementById('endMonth');
const endDaySelect = document.getElementById('endDay');
const endYearSelect = document.getElementById('endYear');

// Function to open a modal showing a larger image, title, date and explanation
function openModal(imageObj) {
  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'image-modal';
  overlay.className = 'image-modal';

  // Build modal content HTML
  overlay.innerHTML = `
    <div class="modal-content" role="dialog" aria-modal="true" aria-label="${escapeHtml(
      imageObj.title
    )}">
      <h2 class="modal-title">${escapeHtml(imageObj.title)}</h2>
      <img class="modal-image" src="${escapeHtml(imageObj.url)}" alt="${escapeHtml(
    imageObj.title
  )}" />
      <p class="modal-date">${escapeHtml(imageObj.date)}</p>
      <p class="modal-explanation">${escapeHtml(imageObj.explanation)}</p>

      <button class="modal-close" type="button" aria-label="Close">Close</button>
    </div>
  `;

  // Add overlay to the document
  document.body.appendChild(overlay);

  // Prevent background scrolling while modal is open
  document.body.style.overflow = 'hidden';

  // Close handlers: close button and click outside content
  const closeBtn = overlay.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => closeModal(overlay));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal(overlay);
    }
  });
}

// Function to close the modal and restore page state
function closeModal(overlay) {
  if (!overlay) return;
  document.body.removeChild(overlay);
  document.body.style.overflow = '';
}

// Small helper to escape HTML inserted into innerHTML (basic)
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Helper to parse "YYYY-MM-DD" into a Date object (UTC at midnight)
function parseYMD(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Build a Date object from separate month/day/year selects
// If any part is not selected (empty), return null to indicate "no bound"
function buildDateFromParts(monthVal, dayVal, yearVal) {
  if (!monthVal || !dayVal || !yearVal) return null;
  const m = Number(monthVal);
  const d = Number(dayVal);
  const y = Number(yearVal);
  // Create UTC date at midnight for consistent comparisons
  return new Date(Date.UTC(y, m - 1, d));
}

// Function to fetch APOD data and render image cards
// This uses fetch with .then chains to keep the code simple for beginners.
function fetchAndDisplayImages() {
  // Show a simple loading placeholder while we fetch
  gallery.innerHTML = `
    <div class="placeholder">
      <div class="placeholder-icon">⏳</div>
      <p>Loading images…</p>
    </div>
  `;

  // Create and show a separate loading text line above the gallery.
  // This is the requested "Loading images......." line which will be removed after load.
  let loadingTextEl = document.getElementById('loading-text');
  if (!loadingTextEl) {
    loadingTextEl = document.createElement('p');
    loadingTextEl.id = 'loading-text';
    loadingTextEl.className = 'loading-text';
    // The exact text required by the user:
    loadingTextEl.textContent = 'Loading images.......';
    // Insert the loading text just before the gallery so it is visible to the user.
    gallery.parentNode.insertBefore(loadingTextEl, gallery);
  }
  // Ensure it's visible (in case it was hidden previously)
  loadingTextEl.style.display = 'block';

  // Fetch the JSON data from the provided URL
  // RETURN the promise so callers (the button handler) can know when it finishes.
  return fetch(apodData)
    .then((response) => {
      // Check for network errors / bad status codes
      if (!response.ok) {
        throw new Error(`Network error: ${response.status} ${response.statusText}`);
      }
      // Parse the response body as JSON
      return response.json();
    })
    .then((data) => {
      // data is expected to be an array of APOD objects
      // Filter to include only items that are images and map to a simpler object
      const images = data
        .filter((item) => item.media_type === 'image')
        .map((item) => {
          return {
            title: item.title,
            url: item.url,
            date: item.date,
            explanation: item.explanation,
          };
        });

      // Read the selected start/end components and build Date objects (or null)
      const startDate = buildDateFromParts(
        startMonthSelect.value,
        startDaySelect.value,
        startYearSelect.value
      );
      const endDate = buildDateFromParts(
        endMonthSelect.value,
        endDaySelect.value,
        endYearSelect.value
      );

      // Filter images based on the selected date range
      // Use numeric time comparisons so the end date check actually takes effect.
      // Convert dates to millisecond timestamps to avoid any Date object comparison quirks.
      const filteredImages = images.filter((img) => {
        const imgDate = parseYMD(img.date);
        if (!imgDate) return false;

        const imgMs = imgDate.getTime();
        const startMs = startDate ? startDate.getTime() : null;
        const endMs = endDate ? endDate.getTime() : null;

        // If startDate is set, require imgDate >= startDate
        if (startMs !== null && imgMs < startMs) return false;
        // If endDate is set, require imgDate <= endDate
        if (endMs !== null && imgMs > endMs) return false;

        return true;
      });

      // If no images found after filtering, show a friendly message
      if (filteredImages.length === 0) {
        gallery.innerHTML = `
          <div class="placeholder">
            <div class="placeholder-icon">🔍</div>
            <p>No images found for the selected date range.</p>
          </div>
        `;
        return;
      }

      // Build HTML for each image card and insert into the gallery
      // Note: we intentionally do NOT include the explanation on the card.
      const cardsHtml = filteredImages
        .map((img, index) => {
          return `
            <div class="gallery-item" data-index="${index}">
              <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.title)}" />
              <p><strong>${escapeHtml(img.title)}</strong></p>
              <p>${escapeHtml(img.date)}</p>
            </div>
          `;
        })
        .join(''); // join into one string for innerHTML

      gallery.innerHTML = cardsHtml;

      // Attach click handlers to each card to open the modal with full data
      const cardElements = gallery.querySelectorAll('.gallery-item');
      cardElements.forEach((card) => {
        card.addEventListener('click', () => {
          const idx = Number(card.dataset.index);
          const imgObj = filteredImages[idx];
          if (imgObj) {
            openModal(imgObj);
          }
        });
      });
    })
    .catch((error) => {
      // Handle any errors that occurred during fetch or processing
      console.error('Error fetching or processing data:', error);

      // Show an error message in the gallery area
      gallery.innerHTML = `
        <div class="error-message">
          <p>Error loading images. Please try again later.</p>
        </div>
      `;
    })
    .finally(() => {
      // Remove the loading text once fetch + processing completes (success or failure).
      // Use remove() so it is gone from the DOM entirely.
      if (loadingTextEl && loadingTextEl.parentNode) {
        loadingTextEl.parentNode.removeChild(loadingTextEl);
      }
    });
}

// Remove the automatic fetch on load and require the button to be pressed.
// We use a nested function inside the click handler to demonstrate nesting and to manage button state.
getImageBtn.addEventListener('click', () => {
  // Nested function that calls the fetch function and manages UI state
  function performFetch() {
    // Disable the button and give feedback while fetching
    getImageBtn.disabled = true;
    const originalText = getImageBtn.textContent;
    getImageBtn.textContent = 'Fetching...';

    // Call the fetch function (which now returns a promise) so we can re-enable the button afterward
    fetchAndDisplayImages()
      .finally(() => {
        // Restore button state after fetch finishes (success or failure)
        getImageBtn.disabled = false;
        getImageBtn.textContent = originalText;
      });
  }

  // Call the nested function
  performFetch();
});

// Populate date select options with simple ranges
function populateDateSelects() {
  const startYear = 1995;
  const endYear = new Date().getFullYear();

  // Helper to append an option element to a select
  function addOption(selectEl, value, text, isSelected = false, isDisabled = false) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    if (isSelected) option.selected = true;
    if (isDisabled) option.disabled = true;
    selectEl.appendChild(option);
  }

  // Helper to add a placeholder option (e.g. "MM", "DD", "YYYY")
  function addPlaceholder(selectEl, text) {
    addOption(selectEl, '', text, true, true);
  }

  // Clear existing options
  startMonthSelect.innerHTML = '';
  startDaySelect.innerHTML = '';
  startYearSelect.innerHTML = '';
  endMonthSelect.innerHTML = '';
  endDaySelect.innerHTML = '';
  endYearSelect.innerHTML = '';

  // Add placeholders so the selects show MM / DD / YYYY when no input is chosen
  addPlaceholder(startMonthSelect, 'MM');
  addPlaceholder(startDaySelect, 'DD');
  addPlaceholder(startYearSelect, 'YYYY');
  addPlaceholder(endMonthSelect, 'MM');
  addPlaceholder(endDaySelect, 'DD');
  addPlaceholder(endYearSelect, 'YYYY');

  // Populate year selects (same for start and end)
  for (let year = endYear; year >= startYear; year--) {
    addOption(startYearSelect, year, `${year}`);
    addOption(endYearSelect, year, `${year}`);
  }

  // Populate month and day selects with simple ranges (display with leading zeros)
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // helper to format numbers to two digits for display
  const pad2 = (n) => String(n).padStart(2, '0');

  months.forEach((month) => {
    addOption(startMonthSelect, month, pad2(month));
    addOption(endMonthSelect, month, pad2(month));
  });

  days.forEach((day) => {
    addOption(startDaySelect, day, pad2(day));
    addOption(endDaySelect, day, pad2(day));
  });
}

// Initial population of date selects
populateDateSelects();