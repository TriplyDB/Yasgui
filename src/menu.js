var body = document.body,
  mask = document.createElement("div"),
  toggleSlideLeft = document.querySelector(".toggle-slide-left"),
  toggleSlideRight = document.querySelector(".toggle-slide-right"),
  toggleSlideTop = document.querySelector(".toggle-slide-top"),
  toggleSlideBottom = document.querySelector(".toggle-slide-bottom"),
  togglePushLeft = document.querySelector(".toggle-push-left"),
  togglePushRight = document.querySelector(".toggle-push-right"),
  togglePushTop = document.querySelector(".toggle-push-top"),
  togglePushBottom = document.querySelector(".toggle-push-bottom"),
  slideMenuLeft = document.querySelector(".slide-menu-left"),
  slideMenuRight = document.querySelector(".slide-menu-right"),
  slideMenuTop = document.querySelector(".slide-menu-top"),
  slideMenuBottom = document.querySelector(".slide-menu-bottom"),
  pushMenuLeft = document.querySelector(".push-menu-left"),
  pushMenuRight = document.querySelector(".push-menu-right"),
  pushMenuTop = document.querySelector(".push-menu-top"),
  pushMenuBottom = document.querySelector(".push-menu-bottom"),
  activeNav;
mask.className = "mask";

/* slide menu left */
toggleSlideLeft.addEventListener("click", function() {
  classie.add(body, "sml-open");
  document.body.appendChild(mask);
  activeNav = "sml-open";
});

/* slide menu right */
toggleSlideRight.addEventListener("click", function() {
  classie.add(body, "smr-open");
  document.body.appendChild(mask);
  activeNav = "smr-open";
});

/* slide menu top */
toggleSlideTop.addEventListener("click", function() {
  classie.add(body, "smt-open");
  document.body.appendChild(mask);
  activeNav = "smt-open";
});

/* slide menu bottom */
toggleSlideBottom.addEventListener("click", function() {
  classie.add(body, "smb-open");
  document.body.appendChild(mask);
  activeNav = "smb-open";
});

/* push menu left */
togglePushLeft.addEventListener("click", function() {
  classie.add(body, "pml-open");
  document.body.appendChild(mask);
  activeNav = "pml-open";
});

/* push menu right */
togglePushRight.addEventListener("click", function() {
  classie.add(body, "pmr-open");
  document.body.appendChild(mask);
  activeNav = "pmr-open";
});

/* push menu top */
togglePushTop.addEventListener("click", function() {
  classie.add(body, "pmt-open");
  document.body.appendChild(mask);
  activeNav = "pmt-open";
});

/* push menu bottom */
togglePushBottom.addEventListener("click", function() {
  classie.add(body, "pmb-open");
  document.body.appendChild(mask);
  activeNav = "pmb-open";
});

/* hide active menu if mask is clicked */
mask.addEventListener("click", function() {
  classie.remove(body, activeNav);
  activeNav = "";
  document.body.removeChild(mask);
});

/* hide active menu if close menu button is clicked */
[].slice.call(document.querySelectorAll(".close-menu")).forEach(function(el, i) {
  el.addEventListener("click", function() {
    classie.remove(body, activeNav);
    activeNav = "";
    document.body.removeChild(mask);
  });
});
