/* ================= AUTH STATE ================= */

auth.onAuthStateChanged(user => {
  if (user) {
    // Hide hero + modal
    loginScreen.classList.add("hidden");
    loginModal.classList.add("hidden");

    // Show admin UI
    adminHeader.classList.remove("hidden");
    adminDashboard.classList.remove("hidden");
    adminControls.classList.remove("hidden");
  } else {
    // Public view
    adminHeader.classList.add("hidden");
    adminDashboard.classList.add("hidden");
    adminControls.classList.add("hidden");
  }
});

/* ================= LOGIN / LOGOUT ================= */

function openLoginModal() {
  loginModal.classList.remove("hidden");
  loginModal.classList.add("flex");
}

function closeLoginModal() {
  loginModal.classList.add("hidden");
  loginModal.classList.remove("flex");
}

function login() {
  loginError.classList.add("hidden");

  auth
    .signInWithEmailAndPassword(email.value, password.value)
    .then(() => {
      closeLoginModal();
    })
    .catch(() => {
      loginError.classList.remove("hidden");
    });
}

function logout() {
  auth.signOut();
}

/* ================= USERS ================= */

function addUser() {
  if (!uname.value || !uphone.value) {
    alert("Please fill user details");
    return;
  }

  db.collection("users").add({
    name: uname.value,
    phone: uphone.value,
    flat: uflat.value,
    activeBook: null
  });

  uname.value = "";
  uphone.value = "";
  uflat.value = "";
}

function deleteUser(id) {
  if (confirm("Delete this user?")) {
    db.collection("users").doc(id).delete();
  }
}

function renderUsers(users) {
  userList.innerHTML = "";

  users.forEach(u => {
    userList.innerHTML += `
      <div class="py-2 flex justify-between items-center">
        <div>
          <p class="font-medium">${u.name}</p>
          <p class="text-sm text-gray-500">
            ${u.phone} • Flat ${u.flat || "-"}
          </p>
        </div>
        <button
          onclick="deleteUser('${u.id}')"
          class="text-red-500 text-sm">
          Delete
        </button>
      </div>
    `;
  });
}

/* ================= BOOKS ================= */

function addBook() {
  const file = bimage.files[0];

  if (!btitle.value || !file) {
    alert("Book title and image are required");
    return;
  }

  const bookData = {
    title: btitle.value,
    author: bauthor.value,
    category: bcategory.value,
    owner: bowner.value,
    status: "Available",
    issuedTo: null,
    createdAt: Date.now()
  };

  const imageRef = storage.ref("books/" + Date.now());

  imageRef
    .put(file)
    .then(() => imageRef.getDownloadURL())
    .then(url => {
      bookData.image = url;
      return db.collection("books").add(bookData);
    })
    .then(() => {
      alert("Book added successfully");

      btitle.value = "";
      bauthor.value = "";
      bcategory.value = "";
      bowner.value = "";
      bimage.value = "";
    })
    .catch(err => {
      alert("Failed to add book");
      console.error(err);
    });
}

function deleteBook(id) {
  if (confirm("Delete this book?")) {
    db.collection("books").doc(id).delete();
  }
}

/* ================= CHECKOUT / CHECKIN ================= */

async function checkoutBook(bookId) {
  const usersSnap = await db.collection("users").get();
  const freeUser = usersSnap.docs.find(
    u => u.data().activeBook === null
  );

  if (!freeUser) {
    alert("No user available (1 book per user)");
    return;
  }

  await db.collection("books").doc(bookId).update({
    status: "Checked Out",
    issuedTo: freeUser.id
  });

  await db.collection("users").doc(freeUser.id).update({
    activeBook: bookId
  });
}

async function checkinBook(bookId, userId) {
  await db.collection("books").doc(bookId).update({
    status: "Available",
    issuedTo: null
  });

  await db.collection("users").doc(userId).update({
    activeBook: null
  });
}

/* ================= SEARCH ================= */

let allBooks = [];

function searchBooks() {
  const term = searchInput.value.toLowerCase();

  const filtered = allBooks.filter(b =>
    b.title.toLowerCase().includes(term) ||
    (b.author || "").toLowerCase().includes(term) ||
    (b.category || "").toLowerCase().includes(term)
  );

  renderBooks(filtered);
}

/* ================= RENDER BOOKS ================= */

function renderBooks(books) {
  bookList.innerHTML = "";

  books.forEach(b => {
    bookList.innerHTML += `
      <div class="bg-white p-4 rounded-2xl shadow">
        <img
          src="${b.image}"
          class="h-40 w-full object-cover rounded-xl"
        />

        <h3 class="font-semibold mt-2">${b.title}</h3>

        <p class="text-sm text-gray-500">
          ${b.author || "Unknown Author"}
        </p>

        <span class="text-sm ${
          b.status === "Available"
            ? "text-green-500"
            : "text-red-500"
        }">
          ${b.status}
        </span>

        ${
          auth.currentUser
            ? `
          <div class="mt-3 space-y-2">
            ${
              b.status === "Available"
                ? `<button
                     onclick="checkoutBook('${b.id}')"
                     class="btn w-full">
                     Checkout
                   </button>`
                : `<button
                     onclick="checkinBook('${b.id}','${b.issuedTo}')"
                     class="btn w-full bg-gray-500">
                     Check-in
                   </button>`
            }
            <button
              onclick="deleteBook('${b.id}')"
              class="text-red-500 text-sm w-full">
              Delete Book
            </button>
          </div>`
            : ""
        }
      </div>
    `;
  });
}

/* ================= LIVE DATA ================= */

db.collection("books")
  .orderBy("createdAt", "desc")
  .onSnapshot(snapshot => {
    allBooks = [];

    let available = 0;
    let issued = 0;

    snapshot.forEach(doc => {
      const b = doc.data();
      b.id = doc.id;
      allBooks.push(b);

      b.status === "Available" ? available++ : issued++;
    });

    totalBooks.innerText = allBooks.length;
    availableBooks.innerText = available;
    checkedOutBooks.innerText = issued;

    renderBooks(allBooks);
  });

db.collection("users").onSnapshot(snapshot => {
  const users = [];

  snapshot.forEach(doc => {
    const u = doc.data();
    u.id = doc.id;
    users.push(u);
  });

  totalUsers.innerText = users.length;
  renderUsers(users);
});
