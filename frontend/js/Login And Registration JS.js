document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === tab));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.toggle('active', form.id === `${tab.dataset.panel}-form`));
}));
