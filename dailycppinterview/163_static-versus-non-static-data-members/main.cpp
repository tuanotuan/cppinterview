// Real-World C++ Interviews Q163: What is the difference between static data members and normal
// data members?
// Key: Each object contains its own non-static data members, while a static data member belongs
// to the class and is shared by all objects. A static member has static storage duration and
// can exist even when no instance exists; since C++17 it can be defined as `inline static`
// inside the class. Static member functions have no `this` pointer and can directly access only
// static members, whereas non-static member functions operate on a particular object.
#include <iostream>

class Item {
public:
    explicit Item(int id) : id_(id) { ++live_count_; }
    Item(const Item& other) : id_(other.id_) { ++live_count_; }
    ~Item() { --live_count_; }

    int id() const { return id_; }
    static int live_count() { return live_count_; }

private:
    int id_{};
    inline static int live_count_{};
};

int main() {
    const Item first{1};
    const Item second{2};
    std::cout << first.id() << ' ' << second.id() << ' ' << Item::live_count()
              << std::endl;
}
