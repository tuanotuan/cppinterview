#include <iostream>
#include <iterator>
#include <memory>
#include <utility>

struct Node : std::enable_shared_from_this<Node> {
    std::weak_ptr<Node> observer() {
        return weak_from_this();
    }
};

int main() {
    int values[]{4, 5, 6};
    const auto& read_only = std::as_const(values);
    std::cout << "size: " << std::size(read_only) << '\n';
    std::cout << "first: " << *std::data(read_only) << '\n';
    std::cout << "empty: " << std::empty(read_only) << '\n';

    const auto owner = std::make_shared<Node>();
    const auto observer = owner->observer();
    std::cout << "observer alive: " << !observer.expired() << '\n';
}
