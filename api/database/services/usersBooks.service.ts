import { FindOptions } from 'sequelize';
import { UsersBooks } from '../models/UsersBooks.model.ts';
import { Book } from '../models/Book.model.ts';
import * as bookModule from '../../modules/books/index.ts';
import { GoogleBooksApiResponse } from '../../types/GoogleBooks.types.ts';

/**
 * interface for BookDetails
 */
interface BookDetails {
  title: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  description: string;
  pageCount: number;
  averageRating: number;
  bookDetails?: GoogleBooksApiResponse | undefined;
  imageLinks: {
    thumbnail: string;
  };
}

/**
 * interface for UserBookDetails
 */
interface UserBookDetails {
  book: BookDetails;
  userId: number;
  bookId: number;
  userRating?: number;
  dateStarted?: Date;
  dateFinished?: Date;
  userNotes?: string;
  quickLink?: string;
  import?: boolean;
}

/**
 * interface for UsersBooks with Book
 */
interface UsersBooksType extends UsersBooks {
  book: Book;
}

/**
 * Get all books for a user, joined with Book to get all details
 * @param {number} userId
 * @returns {Promise<UserBookDetails[]>} books
 */
async function getBooksForUser(userId: number): Promise<UserBookDetails[]> {
  try {
    const books = await UsersBooks.findAll({
      where: {
        userId
      },
      include: [
        {
          model: Book,
          as: 'book'
        }
      ]
    } as FindOptions);

    // Fetch detailed book information from Google Books API for each book
    const booksWithDetails = await Promise.all(
      (books as UsersBooksType[]).map(async (userBook: UsersBooksType) => {
        let bookDetails: GoogleBooksApiResponse | undefined
          = userBook.book.bookDetails;

        /**
         * Updating books to store a valid bookDetails object in the database
         */
        if (!bookDetails || !bookDetails.volumeInfo?.title) {
          bookDetails = await bookModule.getFromBookQuickLink(
            userBook.book.quickLink
          );

          await userBook.book.update({ bookDetails });
        }

      return {
        ...userBook.toJSON(),
        book: {
        ...userBook.book.toJSON(),
        bookDetails
        }
      } as UserBookDetails;
      })
    );

    return booksWithDetails;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}

/**
 * Get a single book with details for a user
 * @param {number} userId
 * @param {number} bookId
 * @returns {Promise<UsersBooksType | null>} book
 */
async function getBookForUser(
  userId: number, bookId: number
): Promise<UserBookDetails | null> {
  try {
    const book = await UsersBooks.findOne({
      where: {
        userId,
        id: bookId
      },
      include: [
        {
          model: Book,
          as: 'book'
        }
      ]
    } as FindOptions);

    if (!book) {
      return null;
    }

    // Fetch detailed book information from Google Books API for the book
    const bookWithDetails = book as UsersBooksType;

    const bookDetails = await bookModule.getFromBookQuickLink(
      bookWithDetails.book.quickLink
    );

    const bookWithDetailsResult: UserBookDetails = {
      ...bookWithDetails.toJSON(),
      book: {
        ...bookWithDetails.book.toJSON(),
        ...bookDetails
      } as BookDetails
    };

    return bookWithDetailsResult;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}

/**
 * Add a new book to a user
 * @param {number} userId
 * @param {number} bookId
 * @param {number | null} userRating
 * @param {Date | null} dateStarted
 * @param {Date | null} dateFinished
 * @param {string | null} userNotes
 * @returns {Promise<UsersBooksType>} book
 */
async function addBookToUser(
  userId: number,
  bookId: number,
  userRating: number | null = null,
  dateStarted: Date | null = null,
  dateFinished: Date | null = null,
  userNotes: string | null = null,
  importBook: boolean = false
): Promise<UsersBooks> {
  if (userRating !== null && userRating > 10) {
    throw new Error('User rating must be between 1 and 10');
  }
  if (dateStarted && dateFinished && dateStarted > dateFinished) {
    throw new Error('Date started must be before date finished');
  }
  if (dateStarted && dateStarted > new Date()) {
    throw new Error('Date started must be in the past');
  }
  const bookExists = await Book.findByPk(bookId);
  if (!bookExists) {
    throw new Error('Book does not exist');
  }
  try {
    // check if book is already in user's books
    const existingBook = await UsersBooks.findOne({
      where: { userId, bookId }
    });
    if (existingBook) {
      // get book with details and return
      return existingBook as UsersBooksType;
    }

    const userBook = await UsersBooks.create({
      userId,
      bookId,
      userRating: userRating ? userRating : null,
      dateStarted: dateStarted ? dateStarted : null,
      dateFinished: dateFinished ? dateFinished : null,
      userNotes: userNotes?.length ? userNotes : null,
      import: importBook
    });

    const bookWithDetails = await UsersBooks.findOne({
      where: { id: userBook.id },
      include: [
        {
          model: Book,
          as: 'book'
        }
      ]
    } as FindOptions);

    return bookWithDetails!;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}

/**
 * Update an existing user book entry
 * @param {number} userId
 * @param {number} bookId
 * @param {number | null} userRating
 * @param {Date | null} dateStarted
 * @param {Date | null} dateFinished
 * @param {string | null} userNotes
 * @returns {Promise<UsersBooksType>} book
 */
async function updateUserBook(
  userId: number,
  bookId: number,
  userRating: number | null = null,
  dateStarted: Date | null = null,
  dateFinished: Date | null = null,
  userNotes: string | null = null
): Promise<UsersBooksType> {
  if (userRating !== null && (userRating < 1 || userRating > 10)) {
    throw new Error('User rating must be between 1 and 10');
  }
  if (dateStarted && dateFinished && dateStarted > dateFinished) {
    throw new Error('Date started must be before date finished');
  }
  if (dateStarted && dateStarted > new Date()) {
    throw new Error('Date started must be in the past');
  }

  try {
    const userBook = await UsersBooks.findOne({
      where: { userId, id: bookId }
    });

    if (!userBook) {
      throw new Error('Book not found for this user');
    }

    await userBook.update({
      userRating,
      dateStarted,
      dateFinished,
      userNotes
    });

    const updatedBook = await UsersBooks.findOne({
      where: { id: userBook.id },
      include: [
        {
          model: Book,
          as: 'book'
        }
      ]
    } as FindOptions);

    return updatedBook as UsersBooksType;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}

/**
 * Delete a book from a user
 * @param {number} userId
 * @param {number} bookId - the id of the book row to delete
 * @returns {Promise<void>}
 */
async function deleteBookFromUser(
  userId: number,
  bookId: number
): Promise<void> {
  try {
    const result = await UsersBooks.destroy({
      where: { userId, id: bookId }
    });
    if (!result) {
      throw new Error('Book not found');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error('An unknown error occurred');
    }
  }
}

export {
  getBooksForUser,
  getBookForUser,
  addBookToUser,
  updateUserBook,
  deleteBookFromUser,
};