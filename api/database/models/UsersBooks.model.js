const { Model, DataTypes } = require('sequelize');

class UsersBooks extends Model {
  static init(sequelize) {
    super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      bookId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'books',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userRating: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 10
        }
      },
      dateStarted: {
        type: DataTypes.DATE,
        allowNull: true
      },
      dateFinished: {
        type: DataTypes.DATE,
        allowNull: true
      },
      userNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [1, 1000]
        }
      }
    }, {
      sequelize,
      modelName: 'UsersBooks',
      tableName: 'users_books',
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    this.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
  }
}

module.exports = UsersBooks;