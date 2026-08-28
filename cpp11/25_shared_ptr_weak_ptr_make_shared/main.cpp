#include <iostream>
#include <memory>

int main() {
    std::shared_ptr<int> first = std::make_shared<int>(42);
    std::shared_ptr<int> second = first;
    std::weak_ptr<int> observer = first;

    std::cout << "owners=" << first.use_count() << '\n';
    if (std::shared_ptr<int> locked = observer.lock()) {
        std::cout << "value=" << *locked << '\n';
    }

    first.reset();
    second.reset();
    std::cout << "expired=" << observer.expired() << '\n';
}
