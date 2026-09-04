// Real-World C++ Interviews Q050: What is a trivial class in C++?
// Key: A trivial class has eligible special member operations and destruction that are trivial
// and has no virtual machinery that would require custom runtime work. Exact traits vary by
// operation and standard, so test the property you need with the corresponding type trait.
#include <type_traits>

struct Record {
    int id;
    double value;
};

int main() {
    static_assert(std::is_trivially_copyable_v<Record>);
}
