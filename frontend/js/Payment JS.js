const cardNumberInput = document.querySelector('.card-number-input');
const cardNumberBox = document.querySelector('.card-number-box');
const cardHolderInput = document.querySelector('.card-holder-input');
const cardHolderName = document.querySelector('.card-holder-name');
const monthInput = document.querySelector('.month-input');
const yearInput = document.querySelector('.year-input');
const cvvInput = document.querySelector('.cvv-input');
const cardFront = document.querySelector('.front');
const cardBack = document.querySelector('.back');

cardNumberInput.addEventListener('input', () => {
    const digits = cardNumberInput.value.replace(/\D/g, '').slice(0, 16);
    cardNumberInput.value = digits.replace(/(.{4})/g, '$1 ').trim();
    cardNumberBox.textContent = digits ? cardNumberInput.value.padEnd(19, '•') : '•••• •••• •••• ••••';
});

cardHolderInput.addEventListener('input', () => {
    cardHolderName.textContent = cardHolderInput.value.trim().toUpperCase() || 'YOUR NAME';
});

monthInput.addEventListener('change', () => { document.querySelector('.exp-month').textContent = monthInput.value || 'MM'; });
yearInput.addEventListener('change', () => { document.querySelector('.exp-year').textContent = yearInput.value ? yearInput.value.slice(-2) : 'YY'; });

const showCardBack = () => { cardFront.style.transform = 'rotateY(-180deg)'; cardBack.style.transform = 'rotateY(0deg)'; };
const showCardFront = () => { cardFront.style.transform = 'rotateY(0deg)'; cardBack.style.transform = 'rotateY(180deg)'; };
cvvInput.addEventListener('focus', showCardBack);
cvvInput.addEventListener('mouseenter', showCardBack);
cvvInput.addEventListener('blur', showCardFront);
cvvInput.addEventListener('mouseleave', showCardFront);
cvvInput.addEventListener('input', () => { cvvInput.value = cvvInput.value.replace(/\D/g, '').slice(0, 4); document.querySelector('.cvv-box').textContent = cvvInput.value || '•••'; });
