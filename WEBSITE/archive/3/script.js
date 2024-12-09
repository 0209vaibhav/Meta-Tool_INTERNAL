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

    // Update the live data in the right-side container
    gyroDataRef.on('value', (snapshot) => {
        console.log('Attempting to read data from Firebase...');
        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log('Firebase data received:', data); // Debugging to confirm data retrieval
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
            } else {
                console.error('Unexpected data format received:', data);
                liveDataContainer.innerHTML = `<p>Unexpected data format received from Firebase.</p>`;
            }
        } else {
            console.warn('No data available at the specified path in Firebase.');
            liveDataContainer.innerHTML = `<p>No data available</p>`;
        }
    }, (error) => {
        console.error('Error reading data from Firebase:', error);
        liveDataContainer.innerHTML = `<p>Error retrieving data from Firebase: ${error.message}</p>`;
    });

    // Existing hover functionality for grid items
    document.querySelectorAll('.grid-item').forEach((item) => {
        let intervalId;

        // Add an event listener for the 'mouseenter' event on each grid item
        item.addEventListener('mouseenter', () => {
            // Apply hover effect to the entire grid item, including both image and labels
            item.classList.add('hover-active');

            // Select the label that shows the count and time for the current item
            let countLabel = item.querySelector('.count-time-label');
            // Retrieve the current count from the label's data attribute, defaulting to '0' if not set
            let countValue = parseInt(countLabel.getAttribute('data-count') || '0', 10) + 1;
            // Update the count attribute and the label text to reflect the new count
            countLabel.setAttribute('data-count', countValue);
            let cumulativeTime = parseInt(item.getAttribute('data-cumulative-time') || '0', 10);
            countLabel.textContent = `Count: ${countValue} | Time: ${cumulativeTime}s`;

            // Record the current timestamp to calculate hover duration later
            let startTime = Date.now();
            item.setAttribute('data-timer', startTime);

            // Clear any existing interval to avoid multiple intervals running
            clearInterval(intervalId);

            // Start an interval to update the timer live every second
            intervalId = setInterval(() => {
                let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                let totalElapsedTime = cumulativeTime + elapsedTime;
                countLabel.textContent = `Count: ${countValue} | Time: ${totalElapsedTime}s`;
            }, 1000);
        });

        // Add an event listener for the 'mouseleave' event on each grid item
        item.addEventListener('mouseleave', () => {
            // Remove hover effect from the entire grid item
            item.classList.remove('hover-active');

            // Retrieve the start time from the data attribute
            let startTime = parseInt(item.getAttribute('data-timer'));
            if (!isNaN(startTime)) {
                // Calculate the elapsed time in seconds by subtracting start time from the current time
                let elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                // Retrieve the cumulative time from the count-time-label's data attribute, defaulting to '0' if not set
                let cumulativeTime = parseInt(item.getAttribute('data-cumulative-time') || '0', 10) + elapsedTime;
                // Update the cumulative time in the data attribute
                item.setAttribute('data-cumulative-time', cumulativeTime);
                // Update the label with the count and cumulative time
                let countLabel = item.querySelector('.count-time-label');
                let countValue = countLabel.getAttribute('data-count');
                countLabel.textContent = `Count: ${countValue} | Time: ${cumulativeTime}s`;
            }

            // Clear the interval to stop updating the timer live
            clearInterval(intervalId);
        });
    });
});
