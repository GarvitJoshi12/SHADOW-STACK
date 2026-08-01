function updateCart() {

    let total = 0;
    let items = 0;
    let save = 0;

    document.querySelectorAll(".qty").forEach(function(q){

        let price = Number(q.dataset.price);
        let qty = Number(q.value);
        let discount = Number(q.dataset.save);

        total += price * qty;
        save += discount * qty;
        items += qty;

    });

    let finalTotal = total - save;

    document.getElementById("originalPrice").innerHTML =
        "₹" + total.toFixed(2).replace(".00","");

    document.getElementById("totalSave").innerHTML =
        "₹" + save.toFixed(2).replace(".00","");

    document.getElementById("totalPrice").innerHTML =
        "₹" + finalTotal.toFixed(2).replace(".00","");

    document.getElementById("totalItems").innerHTML = items;
}

document.querySelectorAll(".qty").forEach(function(q){
    q.addEventListener("input", updateCart);
});

document.querySelectorAll(".remove-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
        this.closest(".product").remove();
        updateCart();
    });
});

updateCart();