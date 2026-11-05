function daysOverdue(dueDate, returnDate) {
  const due = new Date(dueDate);
  const ret = new Date(returnDate);
  const diff = Math.round((ret - due) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

module.exports = { daysOverdue };
