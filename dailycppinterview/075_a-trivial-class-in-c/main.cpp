// Real-World C++ Interviews Q075: What is a trivial class in C++?
// Key: Triviality means the relevant construction, copy, move, or destruction operation
// requires no custom action under the standard's rules. Use traits such as
// `std::is_trivially_copyable_v<T>` for the exact operation instead of relying on appearance.
#include <type_traits>

struct Record {
    int id;
    double value;
};

int main() {
    static_assert(std::is_trivially_copyable_v<Record>);
}
