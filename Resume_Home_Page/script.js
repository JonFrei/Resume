const hamburger = document.querySelector(".hamburger");
const HeaderUList = document.querySelector(".HeaderUList");

hamburger.addEventListener("click", () =>
    {
      hamburger.classList.toggle("active");
      HeaderUList.classList.toggle("active");
    }
)

document.querySelectorAll(".navText").forEach(n => n.addEventListener("click", () => 
    {
        hamburger.classList.remove("active");
        HeaderUList.classList.remove("active");
    }
))