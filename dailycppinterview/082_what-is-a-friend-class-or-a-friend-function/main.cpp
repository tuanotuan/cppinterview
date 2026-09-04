// Real-World C++ Interviews Q082: Explain what is a friend class or a friend function
// Key: A friend function or class receives access to private and protected members without
// becoming a member or base. Friendship is explicitly granted, is neither inherited nor
// transitive, and should be limited to collaborators that help maintain the invariant.
class Vault {
    friend int inspect(const Vault& value);

public:
    explicit Vault(int code) : code_(code) {}

private:
    int code_;
};

int inspect(const Vault& value) {
    return value.code_;
}

int main() {
    return inspect(Vault{42}) == 42 ? 0 : 1;
}
