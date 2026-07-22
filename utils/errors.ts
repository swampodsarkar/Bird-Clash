
export const getFirebaseErrorMessage = (error: any): string => {
  if (!error || !error.code) {
    return "An unexpected error occurred. Please check your network connection and try again.";
  }

  switch (error.code) {
    // Auth Errors
    case 'auth/invalid-credential':
      return "The login information provided is incorrect, malformed, or has expired. Please try again.";
    case 'auth/invalid-email':
      return "Please enter a valid email address.";
    case 'auth/user-disabled':
      return "This account has been disabled by an administrator.";
    case 'auth/user-not-found':
      return "No account found with this email address.";
    case 'auth/wrong-password':
      return "Incorrect password. Please try again.";
    case 'auth/email-already-in-use':
      return "An account with this email address already exists.";
    case 'auth/weak-password':
      return "The password is too weak. It must be at least 6 characters long.";
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return "The sign-in process was cancelled.";
    case 'auth/requires-recent-login':
      return "This action is sensitive and requires a recent login. Please sign out and sign back in.";

    // Firestore Errors
    case 'permission-denied':
      return "You do not have permission to perform this action. Please contact support if you believe this is an error.";
    case 'unavailable':
      return "Could not connect to the server. Please check your internet connection.";
    case 'not-found':
        return "The requested data could not be found.";
    case 'deadline-exceeded':
        return "The request took too long to complete. Please check your internet connection and try again.";

    // General
    default:
      console.error("Unhandled Firebase Error:", error);
      return "An unexpected error occurred. Please try again later.";
  }
};