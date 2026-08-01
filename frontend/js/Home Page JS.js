const hoursEl = document.getElementById("hours");
const minsEl = document.getElementById("mins");
const secondsEl = document.getElementById("seconds");

function countdown() {

    // 8 hours countdown
    const saleEnd = new Date().getTime() + (8 * 60 * 60 * 1000);

    function update() {

        const now = new Date().getTime();
        const distance = saleEnd - now;

        if (distance <= 0) {
            hoursEl.innerHTML = "00";
            minsEl.innerHTML = "00";
            secondsEl.innerHTML = "00";
            clearInterval(timer);
            return;
        }

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        hoursEl.innerHTML = String(hours).padStart(2, "0");
        minsEl.innerHTML = String(minutes).padStart(2, "0");
        secondsEl.innerHTML = String(seconds).padStart(2, "0");
    }

    update();
    const timer = setInterval(update, 1000);
}

countdown();