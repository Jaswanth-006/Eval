document.getElementById('calculateBtn').addEventListener('click', async () => {
    // Get the current active tab
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject our scraping function into the Evalify webpage
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeAndCalculate,
    }, (injectionResults) => {
        // Grab the data returned from the webpage
        const data = injectionResults[0].result;

        const errorMsg = document.getElementById('error-msg');
        const resultsDiv = document.getElementById('results');

        // If no data was found, show the error message
        if (!data || data.scores.length === 0) {
            errorMsg.classList.remove('hidden');
            resultsDiv.classList.add('hidden');
            return;
        }

        // If data is found, hide the error and show the results dashboard
        errorMsg.classList.add('hidden');
        resultsDiv.classList.remove('hidden');

        // Update the HTML with our calculated values
        document.getElementById('totalQuizzes').textContent = data.totalQuizzes;
        document.getElementById('best6Avg').textContent = data.best6Average.toFixed(2) + '%';
        document.getElementById('finalMarks').textContent = data.internals.toFixed(2);
    });
});

// --- THIS FUNCTION RUNS DIRECTLY INSIDE THE EVALIFY WEBPAGE ---
function scrapeAndCalculate() {
    // Grab all visible text on the page
    const pageText = document.body.innerText;
    
    // Regex to match the percentages in parentheses, e.g., (92.0%) or (85%)
    const regex = /\((\d+(?:\.\d+)?)%\)/g;
    const percentages = [];
    let match;

    // Find all matches and push the numeric value to our array
    while ((match = regex.exec(pageText)) !== null) {
        percentages.push(parseFloat(match[1]));
    }

    // If no percentages are found, return empty
    if (percentages.length === 0) {
        return { scores: [] };
    }

    // 1. Sort percentages in descending order (highest to lowest)
    percentages.sort((a, b) => b - a);

    // 2. Get the best 6 (if there are less than 6, it safely takes whatever is available)
    const best6 = percentages.slice(0, 6);

    // 3. Calculate the average of those best 6
    const sum = best6.reduce((acc, val) => acc + val, 0);
    const best6Average = sum / best6.length;

    // 4. Calculate internal marks (out of 30) -> average * 0.3
    const internals = best6Average * 0.3;

    // Return the packaged data back to the popup extension
    return {
        scores: percentages,
        totalQuizzes: percentages.length,
        best6Average: best6Average,
        internals: internals
    };
}