// script.js

document.addEventListener("DOMContentLoaded", function () {
  const dietInput = document.getElementById("diet-input");
  const dietList = document.getElementById("diet-list");

  dietInput.addEventListener("focus", function () {
    dietList.style.display = "block";
  });

  dietInput.addEventListener("blur", function () {
    // Delay hiding the dropdown to allow click events on options to trigger
    setTimeout(function () {
      dietList.style.display = "none";
    }, 200); // Adjust the delay time as needed
  });

  // Move the click event listeners outside the focus event listeners
  var options = Array.from(dietList.getElementsByTagName("li"));
  let interestButtons = document.querySelectorAll(".sel");

  options.forEach((option) => {
    option.addEventListener("click", function () {
      dietInput.value = option.textContent;
      var selectedText = $(this).text();
      if ($(".sel:contains(" + selectedText + ")").length === 0) {
        var newButton = $(
          '<button class="sel new-sel">' + selectedText + "</button>"
        );
        newButton.css("margin", "5px");
        newButton.addClass("selected");
        $("#sd").append(newButton);
        newButton.click(function () {
          event.preventDefault();
          $(this).remove();
          console.log("New button clicked: " + selectedText);
        });
      }
      dietList.style.display = "none"; // Hide the dropdown after selection
    });
  });

  dietInput.addEventListener("input", function () {
    const searchTerm = dietInput.value.toLowerCase();
    options.forEach((option) => {
      const text = option.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        option.style.display = "block";
      } else {
        option.style.display = "none";
      }
    });
  });

  interestButtons.forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("selected"); // Toggle the 'selected' class
    });
  });

  const optionButtons = document.querySelectorAll(".optbuttons");

  optionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      optionButtons.forEach((otherButton) => {
        if (otherButton !== button) {
          otherButton.classList.remove("selected");
        }
      });

      button.classList.toggle("selected");
    });
  });

  const allergyInput = document.getElementById("allergy-input");
  const allergyList = document.getElementById("allergy-list");

  allergyInput.addEventListener("focus", function () {
    allergyList.style.display = "block";
  });

  allergyInput.addEventListener("blur", function () {
    // Delay hiding the dropdown to allow click events on options to trigger
    setTimeout(function () {
      allergyList.style.display = "none";
    }, 200); // Adjust the delay time as needed
  });

  // Move the click event listeners outside the focus event listener
  var options = Array.from(allergyList.getElementsByTagName("li"));

  options.forEach((option) => {
    option.addEventListener("click", function () {
      allergyInput.value = option.textContent;
      var selectedText = $(this).text();
      if ($(".sel:contains(" + selectedText + ")").length === 0) {
        var newButton = $(
          '<button class="sel new-sel">' + selectedText + "</button>"
        );
        newButton.css("margin", "5px");
        newButton.addClass("selected");
        $("#sd2").append(newButton);
        newButton.click(function () {
          event.preventDefault();
          $(this).remove();
          console.log("New button clicked: " + selectedText);
        });
      }
      allergyList.style.display = "none"; // Hide the dropdown after selection
    });
  });

  allergyInput.addEventListener("input", function () {
    const searchTerm = allergyInput.value.toLowerCase();
    options.forEach((option) => {
      const text = option.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        option.style.display = "block";
      } else {
        option.style.display = "none";
      }
    });
  });
});
