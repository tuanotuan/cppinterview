// Real-World C++ Interviews Q098: What are the good reasons to use init() functions to
// initialize an object?
// Key: An `init()` function is justified mainly for genuine two-phase protocols where
// construction cannot finish immediately, such as registration requiring an already shared
// owner. Otherwise it creates an observable invalid state; prefer constructors or factories
// that return a fully valid object or an error.
#include <optional>

class Connection {
public:
    static std::optional<Connection> create(bool available) {
        if (!available) return std::nullopt;
        return Connection{};
    }

private:
    Connection() = default;
};

int main() {
    return Connection::create(true).has_value() ? 0 : 1;
}
