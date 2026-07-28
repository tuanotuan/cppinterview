#include <iostream>

class Order {
public:
    Order(int id, int quantity)
        : id_(id), quantity_(quantity) {}

    Order(const Order& other)
        : id_(other.id_), quantity_(other.quantity_) {
        std::cout << "Order copied\n";
    }

    void print() const {
        std::cout << "ID: " << id_
                  << ", Quantity: " << quantity_
                  << '\n';
    }

private:
    int id_;
    int quantity_;
};

int main() {
    Order original{101, 50};
    Order copy{original};

    original.print();
    copy.print();
}