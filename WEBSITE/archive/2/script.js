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
