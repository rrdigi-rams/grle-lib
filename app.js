/* ---------------- AUTH ---------------- */

auth.onAuthStateChanged(user => {
  if (user) {
    loginScreen.classList.add("hidden");
    loginModal.classList.add("hidden");

    adminHeader.classList.remove("hidden");
    adminDashboard.classList.remove("hidden");
    adminControls.classList.remove("hidden");
    checkedOutSection.classList.remove("hidden");
  } else {
    adminHeader.classList.add("hidden");
    adminDashboard.classList.add("hidden");
    adminControls.classList.add("hidden");
    checkedOutSection.classList.add("hidden");
  }
});

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
  auth.signInWithEmailAndPassword(email.value, password.value)
    .catch(() => loginError.classList.remove("hidden"));
}

function logout() {
  auth.signOut();
}

/* ---------------- USERS ---------------- */

function addUser() {
  if (!uname.value || !uphone.value) {
    alert("Please enter name & phone");
    return;
  }

  db.collection("users").add({
    name: uname.value,
    phone: uphone.value,
    flat: uflat.value
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
        <button onclick="deleteUser('${u.id}')"
          class="text-red-500 text-sm">
          Delete
        </button>
      </div>
    `;
  });
}

/* ---------------- BOOKS ---------------- */

function addBook() {
  const file = bimage.files[0];
  if (!btitle.value || !file) {
    alert("Title + Image required");
    return;
  }

  const data = {
    title: btitle.value,
    author: bauthor.value,
    category: bcategory.value,
    owner: bowner.value,
    status: "Available",
    issuedTo: null,
    createdAt: Date.now()
  };

  const ref = storage.ref("books/" + Date.now());
  ref.put(file)
    .then(() => ref.getDownloadURL())
    .then(url => {
      data.image = url;
      return db.collection("books").add(data);
    })
    .then(() => {
      btitle.value = "";
      bauthor.value = "";
      bcategory.value = "";
      bowner.value = "";
      bimage.value = "";
    });
}

function deleteBook(id) {
  if (confirm("Delete book?")) db.collection("books").doc(id).delete();
}

/* ---------------- CHECKOUT WITH USER SELECT ---------------- */

let selectedBookForCheckout = null;
let cachedUsers = [];

function openCheckoutModal(bookId) {
  selectedBookForCheckout = bookId;
  checkoutUser.innerHTML = `<option value="">Select User</option>`;
  cachedUsers.forEach(u => {
    checkoutUser.innerHTML += `
      <option value="${u.id}">
        ${u.name} (Flat ${u.flat || "-"})
      </option>`;
  });
  checkoutModal.classList.remove("hidden");
  checkoutModal.classList.add("flex");
}

function closeCheckoutModal() {
  checkoutModal.classList.add("hidden");
  checkoutModal.classList.remove("flex");
}

async function confirmCheckout() {
  const userId = checkoutUser.value;
  if (!userId) return alert("Select a user");

  const user = cachedUsers.find(u => u.id === userId);
  if (!user) return;

  await db.collection("books").doc(selectedBookForCheckout).update({
    status: "Checked Out",
    issuedTo: {
      id: user.id,
      name: user.name,
      phone: user.phone || "",
      flat: user.flat || ""
    }
  });

  closeCheckoutModal();
}

/* ---------------- CHECKIN ---------------- */

async function checkinBook(bookId) {
  await db.collection("books").doc(bookId).update({
    status: "Available",
    issuedTo: null
  });
}

/* ---------------- SEARCH BOOKS ---------------- */

let allBooks = [];
function searchBooks() {
  const term = searchInput.value.toLowerCase();
  renderBooks(allBooks.filter(b =>
    b.title.toLowerCase().includes(term) ||
    (b.author || "").toLowerCase().includes(term) ||
    (b.category || "").toLowerCase().includes(term)
  ));
}

/* ---------------- SEARCH CHECKED OUT ---------------- */

function searchCheckedOut() {
  const term = checkoutSearch.value.toLowerCase();
  renderCheckedOut(allBooks.filter(
    b => b.status === "Checked Out" &&
      (b.title.toLowerCase().includes(term) ||
       (b.issuedTo?.name || "").toLowerCase().includes(term))
  ));
}

/* ---------------- RENDER BOOKS ---------------- */

function renderBooks(books) {
  bookList.innerHTML = "";
  books.forEach(b => {
    bookList.innerHTML += `
      <div class="bg-white p-4 rounded-2xl shadow">
        <img src="${b.image}" class="h-40 w-full object-cover rounded-xl">
        <h3 class="font-semibold mt-2">${b.title}</h3>
        <p class="text-sm text-gray-500">${b.author || ""}</p>
        <span class="text-sm ${b.status === "Available" ? "text-green-500" : "text-red-500"}">
          ${b.status}
        </span>

        ${
          auth.currentUser
            ? `
          <div class="mt-3 space-y-2">
            ${
              b.status === "Available"
                ? `<button onclick="openCheckoutModal('${b.id}')" class="btn w-full">Checkout</button>`
                : `<button onclick="checkinBook('${b.id}')" class="btn w-full bg-gray-500">Check-in</button>`
            }
            <button onclick="deleteBook('${b.id}')" class="text-red-500 text-sm w-full">
              Delete Book
            </button>
          </div>`
            : ""
        }
      </div>
    `;
  });
}

/* ---------------- RENDER CHECKED OUT TABLE ---------------- */

function renderCheckedOut(books) {
  checkedOutTable.innerHTML = "";
  books.forEach(b => {
    if (b.status !== "Checked Out" || !b.issuedTo) return;
    checkedOutTable.innerHTML += `
      <tr class="border-b">
        <td class="p-2">${b.title}</td>
        <td class="p-2">${b.issuedTo.name} (Flat ${b.issuedTo.flat || "-"})</td>
        <td class="p-2">
          <button onclick="checkinBook('${b.id}')" class="text-blue-500 text-sm">
            Return
          </button>
        </td>
      </tr>
    `;
  });
}

/* ---------------- LIVE DATA LISTENERS ---------------- */

db.collection("books").orderBy("createdAt", "desc").onSnapshot(snapshot => {
  allBooks = [];
  let available = 0, issued = 0;

  snapshot.forEach(doc => {
    const b = doc.data();
    b.id = doc.id;
    allBooks.push(b);

    if (b.status === "Available") available++;
    else issued++;
  });

  totalBooks.innerText = allBooks.length;
  availableBooks.innerText = available;
  checkedOutBooks.innerText = issued;

  renderBooks(allBooks);
  renderCheckedOut(allBooks);
});

db.collection("users").onSnapshot(snapshot => {
  const users = [];
  snapshot.forEach(doc => {
    const u = doc.data();
    u.id = doc.id;
    users.push(u);
  });

  cachedUsers = users;
  totalUsers.innerText = users.length;
  renderUsers(users);
});
