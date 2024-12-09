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
    const defaultAnglesRef = database.ref('defaultAngles');

    // Get the live data container by its ID
    const liveDataContainer = document.getElementById('live-data-container');
    const gazePatternContainer = document.getElementById('gaze-pattern-container');

    // Get all grid items
    const gridItems = document.querySelectorAll('.grid-item');

    // Keep track of the current highlighted grid item
    let currentHighlightedIndex = -1;
    let defaultAngles = {};

    // Load recorded default angles from Firebase
    defaultAnglesRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            defaultAngles = snapshot.val();
        }
    });

    // Update the live data in the right-side container and highlight the corresponding grid
    gyroDataRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data && typeof data === 'object') {
                const x = data.x !== undefined ? Math.round(data.x) : 'N/A';
                const y = data.y !== undefined ? Math.round(data.y) : 'N/A';
                const z = data.z !== undefined ? Math.round(data.z) : 'N/A';
                liveDataContainer.innerHTML = `
                    <h2>Live Gyroscope Data</h2>
                    <p>X: ${x}&#176;</p>
                    <p>Y: ${y}&#176;</p>
                    <p>Z: ${z}&#176;</p>
                `;

                // Determine which grid item to highlight based on x and y angles
                const gridIndex = determineGridIndex(parseFloat(x), parseFloat(y), defaultAngles);
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
    function determineGridIndex(x, y, defaultAngles) {
        let closestKey = null;
        let smallestDistance = Infinity;

        // Iterate through default angles to find the closest match
        for (const [key, angles] of Object.entries(defaultAngles)) {
            const dx = x - angles.x;
            const dy = y - angles.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < smallestDistance) {
                smallestDistance = distance;
                closestKey = key;
            }
        }

        // Map grid keys to grid indices
        const gridKeyToIndex = {
            "top-left": 0,
            "top-center": 1,
            "top-right": 2,
            "middle-left": 3,
            "middle-center": 4,
            "middle-right": 5,
            "bottom-left": 6,
            "bottom-center": 7,
            "bottom-right": 8
        };

        return gridKeyToIndex[closestKey] !== undefined ? gridKeyToIndex[closestKey] : -1;
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
        });

        // Add highlight to the selected grid item
        if (index >= 0 && index < gridItems.length) {
            const selectedItem = gridItems[index];
            selectedItem.classList.add('highlight');
        }
    }

    // Function to handle tab visibility for buttons
    function updateGridItemVisibility(tab) {
        gridItems.forEach(item => {
            const countLabel = item.querySelector('.count-time-label, .record-button');

            // Adjust based on the active tab
            if (tab === 'about') {
                countLabel.style.display = 'none';
                countLabel.textContent = '';
            } else if (tab === 'setDefault') {
                countLabel.style.display = 'block';
                countLabel.textContent = 'Record';
                countLabel.dataset.activeTab = 'setDefault';
            } else if (tab === 'gazeTracker') {
                countLabel.style.display = 'block';
                const countValue = countLabel.getAttribute('data-count') || '0';
                const timeValue = countLabel.getAttribute('data-time') || '0';
                countLabel.textContent = `Count: ${countValue} | Time: ${timeValue}s`;
                countLabel.dataset.activeTab = 'gazeTracker';
            }
        });
    }

    // Get the start and reset buttons by their IDs
    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');
    const resetAllButton = document.getElementById('reset-all-button');
    const startGazeTrackingButton = document.getElementById('start-gaze-tracking-button');

    // Add start button functionality
    startButton.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'block';
        document.getElementById('set-default-container').style.display = 'none';
    });

    // Add reset-all button functionality in Set Default tab
    resetAllButton.addEventListener('click', () => {
        defaultAnglesRef.remove();
        gridItems.forEach(item => {
            const recordButton = item.querySelector('.record-button');
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

        // Load and display recorded angles
        defaultAnglesRef.once('value', (snapshot) => {
            if (snapshot.exists()) {
                const angles = snapshot.val();
                gridItems.forEach(item => {
                    const gridKey = item.dataset.gaze;
                    const recordButton = item.querySelector('.record-button');
                    if (angles[gridKey] && recordButton) {
                        recordButton.textContent = `X=${angles[gridKey].x}, Y=${angles[gridKey].y}, Z=${angles[gridKey].z}`;
                    }
                });
            }
        });
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
            if (recordButton.dataset.activeTab === 'setDefault') {
                gyroDataRef.once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        if (data && typeof data === 'object') {
                            const gridKey = item.dataset.gaze;
                            const angles = { x: Math.round(data.x), y: Math.round(data.y), z: Math.round(data.z) };
                            defaultAnglesRef.child(gridKey).set(angles);
                            recordButton.textContent = `X=${angles.x}, Y=${angles.y}, Z=${angles.z}`;
                        } else {
                            recordButton.textContent = 'Recording failed. Try again.';
                        }
                    }
                }, (error) => {
                    recordButton.textContent = `Error: ${error.message}`;
                });
            }
        });
    });

    // Add functionality for "Start Gaze Tracking" button in Set Default tab
    startGazeTrackingButton.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'block';
        document.getElementById('set-default-container').style.display = 'none';
        setDefaultTab.classList.remove('active');
        gazeTrackerTab.classList.add('active');
        aboutTab.classList.remove('active');

        updateGridItemVisibility('gazeTracker');
    });
});
