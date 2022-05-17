const hamburger = document.querySelector(".hamburger");
const navmenu = document.querySelector(".nav-menu");
const navitem = document.querySelector(".nav-item");

hamburger.addEventListener("click", () =>
    {
      hamburger.classList.toggle("active");
      navmenu.classList.toggle("active");
      navitem.classList.toggle("active");
    }
)

document.querySelectorAll(".nav-link").forEach(n => n.addEventListener("click", () => 
    {
        hamburger.classList.remove("active");
        navmenu.classList.remove("active");
        navitem.classList.remove("active");
    }
))
