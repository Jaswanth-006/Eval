// Global variables to hold state
let retrievedScores = [];
let myChart = null;
let currentN = 6; // Default to Best of 6

document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners for the main button
    document.getElementById('scrapeBtn').addEventListener('click', initiateScrape);
    
    // Setup event listeners for the N selector buttons (5, 6, 7, etc.)
    document.querySelectorAll('.selector-bar button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active visual state
            document.querySelectorAll('.selector-bar button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update state and recalculate
            currentN = parseInt(e.target.dataset.n);
            updateDashboard();
        });
    });
});


async function initiateScrape() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject scraping function
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeRawScores,
    }, (injectionResults) => {
        const results = injectionResults[0].result;
        handleScrapeResults(results);
    });
}


function handleScrapeResults(scores) {
    const errorBox = document.getElementById('error-msg');
    const dashboard = document.getElementById('dashboard');
    const badge = document.getElementById('totalQuizzesBadge');

    if (!scores || scores.length === 0) {
        errorBox.classList.remove('hidden');
        dashboard.classList.add('hidden');
        badge.classList.add('hidden');
        return;
    }

    // Success! Save scores to global state
    retrievedScores = scores;

    // Update UI elements
    errorBox.classList.add('hidden');
    dashboard.classList.remove('hidden');
    badge.textContent = `${scores.length} Quizzes Found`;
    badge.classList.remove('hidden');

    // Initialize the chart for the first time
    initializeChart();

    // Run the first calculation based on default N (6)
    updateDashboard();
}

// --- Core Logic ---

function updateDashboard() {
    if (retrievedScores.length === 0) return;

    // 1. Slice the top N scores
    // (slice is safe even if N is bigger than the total array length)
    const topNScores = retrievedScores.slice(0, currentN);
    const actualCountUsed = topNScores.length;

    // 2. Calculate Average
    const sum = topNScores.reduce((acc, val) => acc + val, 0);
    const average = actualCountUsed > 0 ? (sum / actualCountUsed) : 0;

    // 3. Calculate Internals (Average * 0.3)
    const internals = average * 0.3;

    // 4. Update Text Display
    document.getElementById('displayAvg').textContent = average.toFixed(2) + '%';
    document.getElementById('displayInternals').textContent = internals.toFixed(2);

    // 5. Update Chart Data
    updateChartData(topNScores);
}


function initializeChart() {
    const ctx = document.getElementById('topScoresChart').getContext('2d');
    
    // Destroy existing chart if it exists (to avoid duplicates on re-scrape)
    if (myChart) myChart.destroy();

    // Chart.js styling configuration
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            // Initial empty data, will be populated by updateChartData
            labels: [], 
            datasets: [{
                label: 'Quiz Score (%)',
                data: [],
                backgroundColor: '#3b82f6', // Accent blue
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Hide legend to save space
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    displayColors: false,
                    callbacks: {
                        label: (context) => ` Score: ${context.parsed.y}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100, // Assuming scores are percentages out of 100
                    grid: { color: '#334155', drawBorder: false },
                    ticks: { stepSize: 20 }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { maxRotation: 0, autoSkip: true }
                }
            }
        }
    });
}

function updateChartData(topScores) {
    if (!myChart) return;

    // Generate labels like "Q1", "Q2" based on how many scores we have
    const labels = topScores.map((_, index) => `Q${index + 1}`);

    myChart.data.labels = labels;
    myChart.data.datasets[0].data = topScores;
    myChart.update();
}


// --- INJECTED SCRIPT (Runs on Evalify page) ---
// This version ONLY scrapes and sorts. It does not calculate averages.
function scrapeRawScores() {
    const pageText = document.body.innerText;
    // Regex to find percentages in parentheses: (95.5%)
    const regex = /\((\d+(?:\.\d+)?)%\)/g;
    const percentages = [];
    let match;

    while ((match = regex.exec(pageText)) !== null) {
        percentages.push(parseFloat(match[1]));
    }

    // Sort descending (highest first)
    percentages.sort((a, b) => b - a);

    return percentages; // Return the raw, sorted array
}