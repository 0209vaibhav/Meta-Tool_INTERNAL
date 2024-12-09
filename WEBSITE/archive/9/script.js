// Firebase configuration and initialization
// Instead of using import statements, load Firebase SDK using script tags in your HTML file

// Ensure the following scripts are included in your HTML file before this script runs:
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyDrxEgJHzvHEeDBIIXiO3OUMiXr4u3b50g",
        authDomain: "gaze-tracker-b39a8.firebaseapp.com",
        databaseURL: "https://gaze-tracker-b39a8-default-rtdb.firebaseio.com",
        projectId: "gaze-tracker-b39a8",
        storageBucket: "gaze-tracker-b39a8.firebasestorage.app",
        messagingSenderId: "177766647597",
        appId: "1:177766647597:web:b50caaec3cb0784c9fb5a4",
        measurementId: "G-N6N4WPB86G"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    // Reference to gyroscope data in Firebase
    const gyroDataRef = database.ref('angle');

    // Get the live data container by its ID
    const liveDataContainer = document.getElementById('live-data-container');
    const gazePatternContainer = document.getElementById('gaze-pattern-container');

    // Get all grid items
    const gridItems = document.querySelectorAll('.grid-item');

    // Keep track of the current highlighted grid item
    let currentHighlightedIndex = -1;
    let intervalId;

    // Update the live data in the right-side container and highlight the corresponding grid
    gyroDataRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data && typeof data === 'object') {
                const x = data.x !== undefined ? data.x.toFixed(2) : 'N/A';
                const y = data.y !== undefined ? data.y.toFixed(2) : 'N/A';
                const z = data.z !== undefined ? data.z.toFixed(2) : 'N/A';
                liveDataContainer.innerHTML = `
                    <h2>Live Gyroscope Data</h2>
                    <p>X: ${x}&#176;</p>
                    <p>Y: ${y}&#176;</p>
                    <p>Z: ${z}&#176;</p>
                `;

                // Determine which grid item to highlight based on x and y angles
                const gridIndex = determineGridIndex(parseFloat(x), parseFloat(y));
                if (gridIndex !== currentHighlightedIndex) {
                    highlightGridItem(gridIndex);
                    currentHighlightedIndex = gridIndex;
                }

                // Update gaze pattern container
                const gazePattern = determineGazePattern(gridIndex);
                gazePatternContainer.innerHTML = `
                    <h2>Gaze Pattern</h2>
                    <p>${gazePattern}</p>
                `;
            } else {
                liveDataContainer.innerHTML = `<p>Unexpected data format received from Firebase. Please verify the data structure in the database.</p>`;
                gazePatternContainer.innerHTML = `<p>Unable to determine gaze pattern due to incorrect data format.</p>`;
            }
        } else {
            liveDataContainer.innerHTML = `<p>No data available</p>`;
            gazePatternContainer.innerHTML = `<p>No data available</p>`;
        }
    }, (error) => {
        liveDataContainer.innerHTML = `<p>Error retrieving data from Firebase: ${error.message}</p>`;
        gazePatternContainer.innerHTML = `<p>Error retrieving gaze pattern data: ${error.message}</p>`;
    });

    // Function to determine which grid item should be highlighted based on x and y angles
    function determineGridIndex(x, y) {
        let row, col;

        // Determine column based on x angle
        if (x < -60) {
            col = 0; // Left
        } else if (x >= -60 && x <= 60) {
            col = 1; // Center
        } else {
            col = 2; // Right
        }

        // Determine row based on y angle
        if (y < -60) {
            row = 0; // Top
        } else if (y >= -60 && y <= 60) {
            row = 1; // Middle
        } else {
            row = 2; // Bottom
        }

        // Calculate index in the 3x3 grid (row-major order)
        return row * 3 + col;
    }

    // Function to determine gaze pattern based on grid index
    function determineGazePattern(index) {
        const patterns = [
            "Top Left", "Top Center", "Top Right",
            "Middle Left", "Middle Center", "Middle Right",
            "Bottom Left", "Bottom Center", "Bottom Right"
        ];
        return patterns[index] || "Unknown";
    }

    // Function to highlight the appropriate grid item
    function highlightGridItem(index) {
        // Remove highlight from all grid items
        gridItems.forEach(item => {
            item.classList.remove('highlight');
            if (item.dataset.intervalId) {
                clearInterval(item.dataset.intervalId);
            }
        });

        // Add highlight to the selected grid item and start counting time
        if (index >= 0 && index < gridItems.length) {
            const selectedItem = gridItems[index];
            selectedItem.classList.add('highlight');
        }
    }

    // Function to handle tab visibility for buttons
    function updateGridItemVisibility(tab) {
        gridItems.forEach(item => {
            const countLabel = item.querySelector('.count-time-label, .record-button');

            // Clear all styles
            countLabel.style.display = 'none';

            if (tab === 'about') {
                countLabel.textContent = '';
            } else if (tab === 'setDefault') {
                countLabel.style.display = 'block';
                countLabel.textContent = 'Record';
            } else if (tab === 'gazeTracker') {
                countLabel.style.display = 'block';
                const countValue = countLabel.getAttribute('data-count') || '0';
                countLabel.textContent = `Count: ${countValue} | Time: 0s`;
            }
        });
    }

    // Get the start and reset buttons by their IDs
    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');

    // Add start button functionality
    startButton.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'block';
        document.getElementById('set-default-container').style.display = 'none';
    });

    // Add reset button functionality
    resetButton.addEventListener('click', () => {
        document.querySelectorAll('.grid-item').forEach((item) => {
            // Reset tracking data only in Set Default tab
            let recordButton = item.querySelector('.record-button');
            if (recordButton) {
                recordButton.textContent = 'Record';
            }
        });
    });

    // Add functionality to tab buttons
    const aboutTab = document.getElementById('about-tab');
    const setDefaultTab = document.getElementById('set-default-tab');
    const gazeTrackerTab = document.getElementById('gaze-tracker-tab');

    aboutTab.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'block';
        document.getElementById('gaze-tracker-container').style.display = 'none';
        document.getElementById('set-default-container').style.display = 'none';
        setDefaultTab.classList.remove('active');
        gazeTrackerTab.classList.remove('active');
        aboutTab.classList.add('active');

        updateGridItemVisibility('about');
    });

    setDefaultTab.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'none';
        document.getElementById('set-default-container').style.display = 'block';
        setDefaultTab.classList.add('active');
        gazeTrackerTab.classList.remove('active');
        aboutTab.classList.remove('active');

        updateGridItemVisibility('setDefault');
    });

    gazeTrackerTab.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'block';
        document.getElementById('set-default-container').style.display = 'none';
        setDefaultTab.classList.remove('active');
        gazeTrackerTab.classList.add('active');
        aboutTab.classList.remove('active');

        updateGridItemVisibility('gazeTracker');
    });

    // Add functionality for recording default angles in "Set Default" tab
    gridItems.forEach(item => {
        const recordButton = item.querySelector('.record-button');
        recordButton?.addEventListener('click', () => {
            gyroDataRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    if (data && typeof data === 'object') {
                        recordButton.textContent = `X=${data.x.toFixed(2)}, Y=${data.y.toFixed(2)}, Z=${data.z.toFixed(2)}`;
                    } else {
                        recordButton.textContent = 'Recording failed. Try again.';
                    }
                }
            }, (error) => {
                recordButton.textContent = `Error: ${error.message}`;
            });
        });
    });
});
