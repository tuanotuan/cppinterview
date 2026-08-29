#include <iostream>
#include <mutex>
#include <shared_mutex>

class Score {
public:
    void set(int value) {
        std::unique_lock lock{mutex_};
        value_ = value;
    }
    int get() const {
        std::shared_lock lock{mutex_};
        return value_;
    }

private:
    mutable std::shared_mutex mutex_;
    int value_ = 0;
};

struct Account {
    std::mutex mutex;
    int balance;
};

void transfer(Account& from, Account& to, int amount) {
    std::scoped_lock lock{from.mutex, to.mutex};
    from.balance -= amount;
    to.balance += amount;
}

int main() {
    Score score;
    score.set(91);
    Account left{{}, 100};
    Account right{{}, 50};
    transfer(left, right, 30);
    std::cout << "score: " << score.get() << '\n';
    std::cout << "balances: " << left.balance << ", "
              << right.balance << '\n';
}
