// Daily C++ Interview Q076: What advantages does having a default constructor have?
// Key: A default constructor lets an object be created without arguments, which many
// containers, arrays, serializers, and generic algorithms may require. Provide one only if it
// can establish a valid invariant; an invalid default state is worse than requiring data.
#include <type_traits>
#include <vector>

struct Value {
    int number = 0;
};

int main() {
    static_assert(std::is_default_constructible_v<Value>);
    std::vector<Value> values(3);
}
